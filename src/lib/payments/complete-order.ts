import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type ServiceClient = SupabaseClient<Database>

/**
 * Mark a pending gateway order paid and decrement stock once.
 * Safe to call repeatedly (guards on pending_payment / payment_trx_id).
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
    await supabase
      .from('orders')
      .update({
        status: 'awaiting_fulfillment',
        paid_at: new Date().toISOString(),
        payment_trx_id: trxId,
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment')

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

  return { orderNumber: order.order_number }
}
