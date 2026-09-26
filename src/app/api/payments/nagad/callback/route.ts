import { NextRequest, NextResponse } from 'next/server'
import { amountsMatch } from '@/lib/payments/amount-match'
import {
  isNagadPaymentSuccessful,
  verifyNagadPayment,
} from '@/lib/payments/nagad'
import { completeGatewayPaidOrder } from '@/lib/payments/complete-order'
import {
  emitOmsWebhook,
  orderPayloadFromRow,
} from '@/lib/integrations/oms-webhook'
import { createServiceClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Nagad redirects here after customer pays/cancels.
 * Query typically includes payment_ref_id (also accept paymentRefId / status).
 */
export async function GET(request: NextRequest) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  const params = request.nextUrl.searchParams
  const paymentRefId = (
    params.get('payment_ref_id') ||
    params.get('paymentRefId') ||
    params.get('paymentRefID') ||
    ''
  ).trim()
  const status = (params.get('status') || '').toLowerCase()

  const fail = (msg: string) =>
    NextResponse.redirect(
      `${site}/checkout?pay=failed&message=${encodeURIComponent(msg)}`,
    )

  if (!paymentRefId) {
    return fail('Missing Nagad payment reference.')
  }

  if (
    status === 'cancel' ||
    status === 'cancelled' ||
    status === 'aborted' ||
    status === 'failure' ||
    status === 'failed'
  ) {
    try {
      const supabase = createServiceClient()
      await supabase
        .from('payment_attempts')
        .update({
          status: status.includes('cancel') || status === 'aborted'
            ? 'cancelled'
            : 'failed',
        })
        .eq('external_id', paymentRefId)
        .eq('gateway', 'nagad')
        .eq('status', 'created')
    } catch {
      // ignore
    }
    return fail(
      status.includes('cancel') || status === 'aborted'
        ? 'Nagad payment was cancelled.'
        : 'Nagad payment failed.',
    )
  }

  try {
    const supabase = createServiceClient()
    const { data: attempt } = await supabase
      .from('payment_attempts')
      .select('id, order_id, status, amount')
      .eq('external_id', paymentRefId)
      .eq('gateway', 'nagad')
      .maybeSingle()

    if (!attempt) {
      return fail('Payment session not found.')
    }

    if (attempt.status === 'completed') {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', attempt.order_id)
        .maybeSingle()
      return NextResponse.redirect(
        `${site}/checkout?pay=success&orderId=${encodeURIComponent(order?.order_number || '')}`,
      )
    }

    const verified = await verifyNagadPayment(paymentRefId)
    const ok = isNagadPaymentSuccessful(verified)

    if (!ok) {
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          raw_json: verified as unknown as Json,
        })
        .eq('id', attempt.id)
      return fail(
        verified.message ||
          verified.status ||
          'Nagad could not confirm the payment.',
      )
    }

    if (!amountsMatch(attempt.amount, verified.amount)) {
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          raw_json: verified as unknown as Json,
        })
        .eq('id', attempt.id)
      console.error('[nagad callback] amount mismatch', {
        expected: attempt.amount,
        actual: verified.amount,
      })
      return fail('Payment amount did not match the order total.')
    }

    const trxId =
      verified.issuerPaymentRefNo || verified.paymentRefId || paymentRefId

    await supabase
      .from('payment_attempts')
      .update({
        status: 'completed',
        trx_id: trxId,
        raw_json: verified as unknown as Json,
      })
      .eq('id', attempt.id)
      .eq('status', 'created')

    const completed = await completeGatewayPaidOrder(
      supabase,
      attempt.order_id,
      trxId,
    )
    if (!completed) return fail('Order not found after payment.')

    const { data: paidOrder } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, payment_method, total, full_name, phone, email, city_name, zone_name, area_name, address, pathao_consignment_id',
      )
      .eq('id', attempt.order_id)
      .maybeSingle()
    if (paidOrder) {
      void emitOmsWebhook('order.paid', orderPayloadFromRow(paidOrder))
    }

    return NextResponse.redirect(
      `${site}/checkout?pay=success&orderId=${encodeURIComponent(completed.orderNumber)}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[nagad callback]', message)
    return fail(message || 'Payment confirmation failed.')
  }
}
