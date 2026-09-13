import { createClient } from '@/lib/supabase/server'
import type { OrderItemRow, OrderWithItems } from '@/lib/orders/types'

export async function listOrders(limit = 100): Promise<OrderWithItems[]> {
  const supabase = await createClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !orders) {
    console.error('[orders] list', error)
    return []
  }

  const ids = orders.map((o) => o.id)
  if (ids.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', ids)

  if (itemsError) {
    console.error('[orders] items list', itemsError)
  }

  const byOrder = new Map<string, OrderItemRow[]>()
  for (const item of items ?? []) {
    const list = byOrder.get(item.order_id) ?? []
    list.push(item)
    byOrder.set(item.order_id, list)
  }

  return orders.map((order) => ({
    ...order,
    items: byOrder.get(order.id) ?? [],
  }))
}

export async function getOrderById(
  id: string,
): Promise<OrderWithItems | null> {
  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !order) return null

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)

  return { ...order, items: items ?? [] }
}
