import { NextRequest, NextResponse } from 'next/server'
import { executeBkashPayment } from '@/lib/payments/bkash'
import { createServiceClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'

/**
 * bKash redirects here after customer approves/cancels.
 * Query: paymentID, status=success|failure|cancel
 */
export async function GET(request: NextRequest) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  const paymentID = request.nextUrl.searchParams.get('paymentID')?.trim()
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
      const supabase = createServiceClient()
      await supabase
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
    const supabase = createServiceClient()
    const { data: attempt } = await supabase
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
      const { data: order } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', attempt.order_id)
        .maybeSingle()
      return NextResponse.redirect(
        `${site}/checkout?pay=success&orderId=${encodeURIComponent(order?.order_number || '')}`,
      )
    }

    const executed = await executeBkashPayment(paymentID)
    const ok =
      executed.statusCode === '0000' ||
      (executed.transactionStatus || '').toLowerCase() === 'completed'

    if (!ok) {
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          raw_json: executed as unknown as Json,
        })
        .eq('id', attempt.id)
      return fail(
        executed.statusMessage ||
          executed.errorMessage ||
          'bKash could not confirm the payment.',
      )
    }

    // Mark attempt completed (idempotent race: only if still created)
    await supabase
      .from('payment_attempts')
      .update({
        status: 'completed',
        trx_id: executed.trxID ?? null,
        raw_json: executed as unknown as Json,
      })
      .eq('id', attempt.id)
      .eq('status', 'created')

    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_trx_id')
      .eq('id', attempt.order_id)
      .single()

    if (!order) return fail('Order not found after payment.')

    if (order.status === 'pending_payment' && !order.payment_trx_id) {
      await supabase
        .from('orders')
        .update({
          status: 'awaiting_fulfillment',
          paid_at: new Date().toISOString(),
          payment_trx_id: executed.trxID ?? paymentID,
        })
        .eq('id', order.id)
        .eq('status', 'pending_payment')

      // Decrement stock on pay confirm
      const { data: items } = await supabase
        .from('order_items')
        .select('variant_id, quantity')
        .eq('order_id', order.id)

      for (const item of items ?? []) {
        if (!item.variant_id) continue
        const { data: variant } = await supabase
          .from('product_variants')
          .select('stock')
          .eq('id', item.variant_id)
          .maybeSingle()
        if (!variant) continue
        const next = Math.max(0, Number(variant.stock) - Number(item.quantity))
        await supabase
          .from('product_variants')
          .update({ stock: next })
          .eq('id', item.variant_id)
          .gte('stock', item.quantity)
      }
    }

    return NextResponse.redirect(
      `${site}/checkout?pay=success&orderId=${encodeURIComponent(order.order_number)}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[bkash callback]', message)
    return fail(message || 'Payment confirmation failed.')
  }
}
