import { NextRequest, NextResponse } from 'next/server'
import { amountsMatch } from '@/lib/payments/amount-match'
import {
  executeBkashPayment,
  isBkashPaymentCompleted,
  queryBkashPayment,
  type BkashExecutePaymentResponse,
} from '@/lib/payments/bkash'
import { completeGatewayPaidOrder } from '@/lib/payments/complete-order'
import { notifyDiscordNewOrderById } from '@/lib/integrations/discord-orders'
import {
  emitOmsWebhook,
  orderPayloadFromRow,
} from '@/lib/integrations/oms-webhook'
import { createServiceClient } from '@/lib/db/admin'
import type { Json } from '@/lib/db/database.types'

/**
 * bKash redirects here after customer approves/cancels.
 * Query: paymentID (or paymentId), status=success|failure|cancel
 */
export async function GET(request: NextRequest) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  const paymentID =
    request.nextUrl.searchParams.get('paymentID')?.trim() ||
    request.nextUrl.searchParams.get('paymentId')?.trim()
  const status = (
    request.nextUrl.searchParams.get('status') || ''
  ).toLowerCase()

  const fail = (msg: string) =>
    NextResponse.redirect(
      `${site}/checkout?pay=failed&message=${encodeURIComponent(msg)}`,
    )

  if (!paymentID) {
    return fail('Missing bKash payment reference.')
  }

  if (status === 'cancel' || status === 'failure' || status === 'failed') {
    try {
      const db = createServiceClient()
      await db
        .from('payment_attempts')
        .update({
          status: status === 'cancel' ? 'cancelled' : 'failed',
        })
        .eq('external_id', paymentID)
        .eq('status', 'created')
    } catch {
      // ignore
    }
    return fail(
      status === 'cancel'
        ? 'bKash payment was cancelled.'
        : 'bKash payment failed.',
    )
  }

  try {
    const db = createServiceClient()
    const { data: attempt } = await db
      .from('payment_attempts')
      .select('id, order_id, status, amount')
      .eq('external_id', paymentID)
      .eq('gateway', 'bkash')
      .maybeSingle()

    if (!attempt) {
      return fail('Payment session not found.')
    }

    // Idempotent: already completed
    if (attempt.status === 'completed') {
      const { data: order } = await db
        .from('orders')
        .select('order_number')
        .eq('id', attempt.order_id)
        .maybeSingle()
      return NextResponse.redirect(
        `${site}/checkout?pay=success&orderId=${encodeURIComponent(order?.order_number || '')}`,
      )
    }

    let executed: BkashExecutePaymentResponse
    try {
      executed = await executeBkashPayment(paymentID)
    } catch (error) {
      // Email: if Execute does not respond, Query Payment is mandatory.
      console.error('[bkash callback] execute failed, querying', error)
      executed = await queryBkashPayment(paymentID)
    }

    if (!isBkashPaymentCompleted(executed)) {
      // Ambiguous execute — confirm via Query before failing.
      try {
        const queried = await queryBkashPayment(paymentID)
        if (isBkashPaymentCompleted(queried)) {
          executed = queried
        } else {
          await db
            .from('payment_attempts')
            .update({
              status: 'failed',
              raw_json: queried as unknown as Json,
            })
            .eq('id', attempt.id)
          return fail(
            queried.statusMessage ||
              queried.errorMessageEn ||
              queried.errorMessage ||
              'bKash could not confirm the payment.',
          )
        }
      } catch {
        await db
          .from('payment_attempts')
          .update({
            status: 'failed',
            raw_json: executed as unknown as Json,
          })
          .eq('id', attempt.id)
        return fail(
          executed.statusMessage ||
            executed.errorMessageEn ||
            executed.errorMessage ||
            'bKash could not confirm the payment.',
        )
      }
    }

    if (!amountsMatch(attempt.amount, executed.amount)) {
      await db
        .from('payment_attempts')
        .update({
          status: 'failed',
          raw_json: executed as unknown as Json,
        })
        .eq('id', attempt.id)
      console.error('[bkash callback] amount mismatch', {
        expected: attempt.amount,
        actual: executed.amount,
      })
      return fail('Payment amount did not match the order total.')
    }

    const trxId = executed.trxID || executed.trxId || null

    await db
      .from('payment_attempts')
      .update({
        status: 'completed',
        trx_id: trxId,
        raw_json: executed as unknown as Json,
      })
      .eq('id', attempt.id)
      .eq('status', 'created')

    const completed = await completeGatewayPaidOrder(
      db,
      attempt.order_id,
      trxId ?? paymentID,
    )
    if (!completed) return fail('Order not found after payment.')

    const { data: paidOrder } = await db
      .from('orders')
      .select(
        'id, order_number, status, payment_method, total, full_name, phone, email, city_name, zone_name, area_name, address, pathao_consignment_id',
      )
      .eq('id', attempt.order_id)
      .maybeSingle()
    if (paidOrder) {
      void emitOmsWebhook('order.paid', orderPayloadFromRow(paidOrder))
      void notifyDiscordNewOrderById(db, attempt.order_id)
    }

    return NextResponse.redirect(
      `${site}/checkout?pay=success&orderId=${encodeURIComponent(completed.orderNumber)}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[bkash callback]', message)
    return fail(message || 'Payment confirmation failed.')
  }
}
