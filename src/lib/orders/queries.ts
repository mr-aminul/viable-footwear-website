import { createClient } from '@/lib/supabase/server'
import type { OrderItemRow, OrderWithItems } from '@/lib/orders/types'
import type {
  OrderStatus,
  PaymentMethod,
} from '@/lib/supabase/database.types'
import type { Database } from '@/lib/supabase/database.types'

type PaymentAttemptRow =
  Database['public']['Tables']['payment_attempts']['Row']

export type ListOrdersFilters = {
  status?: OrderStatus | ''
  payment?: PaymentMethod | ''
  city?: string
  from?: string
  to?: string
  q?: string
  limit?: number
}

/** Orders ready to send to Pathao (no consignment yet, not cancelled / unpaid). */
export async function countUndispatchedOrders(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .is('pathao_consignment_id', null)
    .neq('status', 'cancelled')
    .neq('status', 'pending_payment')

  if (error) {
    console.error('[orders] undispatched count', error)
    return 0
  }

  return count ?? 0
}

/** Distinct city names for the orders filter dropdown. */
export async function listOrderCityNames(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('city_name')
    .order('city_name', { ascending: true })
    .limit(500)

  if (error || !data) {
    console.error('[orders] cities', error)
    return []
  }

  const seen = new Set<string>()
  const cities: string[] = []
  for (const row of data) {
    const name = row.city_name?.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    cities.push(name)
  }
  return cities
}

export async function listOrders(
  filters: ListOrdersFilters = {},
): Promise<OrderWithItems[]> {
  const supabase = await createClient()
  const limit = filters.limit ?? 100

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.payment) {
    query = query.eq('payment_method', filters.payment)
  }
  if (filters.city?.trim()) {
    query = query.eq('city_name', filters.city.trim())
  }
  if (filters.from?.trim()) {
    const fromIso = `${filters.from.trim()}T00:00:00.000Z`
    query = query.gte('created_at', fromIso)
  }
  if (filters.to?.trim()) {
    const toIso = `${filters.to.trim()}T23:59:59.999Z`
    query = query.lte('created_at', toIso)
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim()
    query = query.or(
      `order_number.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`,
    )
  }

  const { data: orders, error } = await query

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

export async function getPaymentAttemptsForOrder(
  orderId: string,
): Promise<PaymentAttemptRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orders] payment attempts', error)
    return []
  }
  return data ?? []
}

export async function getCampaignNameById(
  campaignId: string | null,
): Promise<string | null> {
  if (!campaignId) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .maybeSingle()

  if (error || !data) return null
  return data.name
}
