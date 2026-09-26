import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { decrementOrderStock } from '@/lib/orders/stock'

type ServiceClient = SupabaseClient<Database>

/**
 * Mark a pending gateway order paid and decrement stock once.
 * Stock is reserved before the paid status change; safe to retry.
 */
export async function completeGatewayPaidOrder(
  supabase: ServiceClient,
  orderId: string,
  trxId: string,
): Promise<{ orderNumber: string } | null> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_trx_id')
    .eq('id', orderId)
    .single()

  if (!order) return null

  if (order.status === 'pending_payment' && !order.payment_trx_id) {
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', order.id)

    const lines = (items ?? [])
      .filter((item) => item.variant_id)
      .map((item) => ({
        variantId: item.variant_id as string,
        quantity: Number(item.quantity),
      }))

    const reserved = await decrementOrderStock(supabase, lines)
    if (!reserved.ok) {
      console.error('[completeGatewayPaidOrder] stock', reserved.error)
      return null
    }

    const { error: payError } = await supabase
      .from('orders')
      .update({
        status: 'awaiting_fulfillment',
        paid_at: new Date().toISOString(),
        payment_trx_id: trxId,
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment')

    if (payError) {
      console.error('[completeGatewayPaidOrder] mark paid', payError)
      return null
    }
  }

  return { orderNumber: order.order_number }
}
