import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_ORDERS_BADGE_TAG } from '@/lib/orders/cache-tags'
import type {
  AdminOrderListRow,
  OrderItemRow,
  OrderWithItems,
} from '@/lib/orders/types'
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

/** Columns the admin orders table actually renders. */
const ORDER_LIST_SELECT =
  'id, order_number, status, payment_method, full_name, phone, city_name, total, pathao_consignment_id, pathao_status, pathao_error, pathao_cancelled_at, created_at' as const

async function fetchUndispatchedOrderCount(): Promise<number> {
  const supabase = createServiceClient()
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

/**
 * Orders ready to send to Pathao (no consignment yet, not cancelled / unpaid).
 * Short Data Cache + tag so layout/nav never waits on a live count query.
 */
export const countUndispatchedOrders = cache(async (): Promise<number> => {
  return unstable_cache(
    fetchUndispatchedOrderCount,
    ['admin-undispatched-orders-count'],
    { revalidate: 30, tags: [ADMIN_ORDERS_BADGE_TAG] },
  )()
})

/** Distinct city names for the orders filter dropdown. */
export async function listOrderCityNames(): Promise<string[]> {
  return unstable_cache(
    async () => {
      const supabase = createServiceClient()
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
    },
    ['admin-order-city-names'],
    { revalidate: 60, tags: [ADMIN_ORDERS_BADGE_TAG] },
  )()
}

/** Slim list for the admin table — no line items. */
export async function listOrders(
  filters: ListOrdersFilters = {},
): Promise<AdminOrderListRow[]> {
  const supabase = await createClient()
  const limit = filters.limit ?? 100

  let query = supabase
    .from('orders')
    .select(ORDER_LIST_SELECT)
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

  return orders as AdminOrderListRow[]
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

  return { ...order, items: (items as OrderItemRow[] | null) ?? [] }
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
