import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/db/admin'
import { createClient } from '@/lib/db/server'
import { ADMIN_ORDERS_BADGE_TAG } from '@/lib/orders/cache-tags'
import type {
  AdminOrderListRow,
  OrderItemRow,
  OrderWithItems,
} from '@/lib/orders/types'
import type {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
} from '@/lib/db/database.types'
import type { Database } from '@/lib/db/database.types'
import { ONLINE_ORDER_CHANNELS } from '@/lib/orders/channels'

type PaymentAttemptRow =
  Database['public']['Tables']['payment_attempts']['Row']

export type ListOrdersFilters = {
  status?: OrderStatus | ''
  payment?: PaymentMethod | ''
  channel?: OrderChannel | ''
  /** Aggregated channel filters for Orders stat cards. */
  channelGroup?: 'online' | 'other' | ''
  city?: string
  from?: string
  to?: string
  q?: string
  limit?: number
}

/** Columns the admin orders table actually renders. */
const ORDER_LIST_SELECT =
  'id, order_number, status, payment_method, channel, full_name, phone, city_name, total, is_preorder, pathao_consignment_id, pathao_status, pathao_error, pathao_cancelled_at, created_at' as const

async function fetchUndispatchedOrderCount(): Promise<number> {
  const db = createServiceClient()
  const { count, error } = await db
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

export type OrderChannelStats = {
  total: number
  toDispatch: number
  online: number
  website: number
  walkIn: number
  byChannel: Record<OrderChannel, number>
}

const EMPTY_CHANNEL_COUNTS: Record<OrderChannel, number> = {
  website: 0,
  messenger: 0,
  whatsapp: 0,
  phone: 0,
  instagram: 0,
  walk_in: 0,
  other: 0,
}

/** Counts for Orders page stat cards (excludes cancelled). */
export async function getOrderChannelStats(): Promise<OrderChannelStats> {
  return unstable_cache(
    async () => {
      const db = createServiceClient()
      const { data, error } = await db
        .from('orders')
        .select('channel, status, pathao_consignment_id')
        .neq('status', 'cancelled')
        .limit(5000)

      if (error || !data) {
        console.error('[orders] channel stats', error)
        return {
          total: 0,
          toDispatch: 0,
          online: 0,
          website: 0,
          walkIn: 0,
          byChannel: { ...EMPTY_CHANNEL_COUNTS },
        }
      }

      const byChannel: Record<OrderChannel, number> = {
        ...EMPTY_CHANNEL_COUNTS,
      }
      let toDispatch = 0

      for (const row of data) {
        const channel = (row.channel ?? 'website') as OrderChannel
        byChannel[channel] = (byChannel[channel] ?? 0) + 1

        if (
          !row.pathao_consignment_id &&
          row.status !== 'pending_payment'
        ) {
          toDispatch += 1
        }
      }

      const online = ONLINE_ORDER_CHANNELS.reduce(
        (sum, channel) => sum + (byChannel[channel] ?? 0),
        0,
      )

      return {
        total: data.length,
        toDispatch,
        online,
        website: byChannel.website,
        walkIn: byChannel.walk_in,
        byChannel,
      }
    },
    ['admin-order-channel-stats'],
    { revalidate: 30, tags: [ADMIN_ORDERS_BADGE_TAG] },
  )()
}

/** Distinct city names for the orders filter dropdown. */
export async function listOrderCityNames(): Promise<string[]> {
  return unstable_cache(
    async () => {
      const db = createServiceClient()
      const { data, error } = await db
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
  const db = await createClient()
  const limit = filters.limit ?? 100

  let query = db
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
  if (filters.channel) {
    query = query.eq('channel', filters.channel)
  } else if (filters.channelGroup === 'online') {
    query = query.in('channel', ONLINE_ORDER_CHANNELS)
  } else if (filters.channelGroup === 'other') {
    query = query.neq('channel', 'website')
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
  const db = await createClient()
  const { data: order, error } = await db
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !order) return null

  const { data: items } = await db
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)

  return { ...order, items: (items as OrderItemRow[] | null) ?? [] }
}

export async function getPaymentAttemptsForOrder(
  orderId: string,
): Promise<PaymentAttemptRow[]> {
  const db = await createClient()
  const { data, error } = await db
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
  const db = await createClient()
  const { data, error } = await db
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .maybeSingle()

  if (error || !data) return null
  return data.name
}
