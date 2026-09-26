import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type DbClient = SupabaseClient<Database>

/**
 * Decrement variant stock for order lines. Fails if any line cannot be reserved.
 */
export async function decrementOrderStock(
  supabase: DbClient,
  lines: { variantId: string; quantity: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const line of lines) {
    const { data: variant, error: loadError } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', line.variantId)
      .maybeSingle()

    if (loadError || !variant) {
      return { ok: false, error: 'Could not reserve stock for an item.' }
    }

    const nextStock = Number(variant.stock) - line.quantity
    if (nextStock < 0) {
      return { ok: false, error: 'An item just went out of stock.' }
    }

    const { data: updated, error: stockError } = await supabase
      .from('product_variants')
      .update({ stock: nextStock })
      .eq('id', line.variantId)
      .gte('stock', line.quantity)
      .select('id')
      .maybeSingle()

    if (stockError || !updated) {
      return { ok: false, error: 'Could not reserve stock for an item.' }
    }
  }
  return { ok: true }
}

/**
 * Restore stock for order line items (COD cancel / paid gateway cancel).
 */
export async function restoreOrderStock(
  supabase: DbClient,
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', orderId)

  if (error) {
    return { ok: false, error: error.message }
  }

  for (const item of items ?? []) {
    if (!item.variant_id) continue
    const qty = Number(item.quantity)
    if (!Number.isFinite(qty) || qty <= 0) continue

    const { data: variant, error: loadError } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', item.variant_id)
      .maybeSingle()

    if (loadError || !variant) {
      return { ok: false, error: 'Could not restore stock for an item.' }
    }

    const { error: updateError } = await supabase
      .from('product_variants')
      .update({ stock: Number(variant.stock) + qty })
      .eq('id', item.variant_id)

    if (updateError) {
      return { ok: false, error: updateError.message }
    }
  }

  return { ok: true }
}

/** Stock was taken if COD (on place) or gateway already paid. */
export function orderHeldStock(order: {
  payment_method: string | null
  payment_trx_id: string | null
  status: string
}): boolean {
  if (order.status === 'pending_payment') return false
  if (order.payment_method === 'cod') return true
  return Boolean(order.payment_trx_id)
}
