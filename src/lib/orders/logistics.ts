import { createClient } from '@/lib/supabase/server'
import { pathaoStatusLabel } from '@/lib/orders/status-labels'
import { pathaoTrackingUrl } from '@/lib/orders/pathao-tracking'
import type { OrderStatus, PaymentMethod } from '@/lib/supabase/database.types'

export type LogisticsBucketKey =
  | 'needs_shipping'
  | 'awaiting_pickup'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'failed'
  | 'stranded'

export type LogisticsBucket = {
  key: LogisticsBucketKey
  label: string
  count: number
}

export type CodSnapshot = {
  outstandingCount: number
  outstandingAmount: number
  collectedCount: number
  collectedAmount: number
}

export type NeedsShippingRow = {
  id: string
  orderNumber: string
  fullName: string
  phone: string
  cityName: string
  paymentMethod: PaymentMethod
  total: number
  status: OrderStatus
  createdAt: string
  pathaoError: string | null
}

export type ActiveShipmentRow = {
  id: string
  orderNumber: string
  fullName: string
  phone: string
  cityName: string
  paymentMethod: PaymentMethod
  total: number
  status: OrderStatus
  pathaoStatus: string | null
  pathaoStatusLabel: string
  pathaoConsignmentId: string
  trackingUrl: string | null
  createdAt: string
}

export type LogisticsAnalytics = {
  buckets: LogisticsBucket[]
  pathaoBreakdown: { label: string; count: number }[]
  cod: CodSnapshot
  needsShipping: NeedsShippingRow[]
  activeShipments: ActiveShipmentRow[]
}

type OrderLogisticsRow = {
  id: string
  order_number: string
  status: OrderStatus
  payment_method: PaymentMethod
  full_name: string
  phone: string
  city_name: string
  total: number
  pathao_consignment_id: string | null
  pathao_status: string | null
  pathao_error: string | null
  pathao_cancelled_at: string | null
  created_at: string
}

function normalizePathaoKey(raw: string | null | undefined): string {
  const text = (raw ?? '').trim().toLowerCase()
  if (!text) return 'submitted'
  if (text.includes('deliver')) return 'delivered'
  if (text.includes('return')) return 'returned'
  if (text.includes('cancel')) return 'cancelled'
  if (
    text.includes('transit') ||
    text.includes('picked') ||
    text.includes('on_the_way') ||
    text.includes('on the way') ||
    text.includes('assigned')
  ) {
    return 'in_transit'
  }
  if (text.includes('pending') || text.includes('pickup')) return 'awaiting_pickup'
  if (text.includes('fail') || text.includes('hold')) return 'failed'
  return text
}

function bucketForOrder(order: OrderLogisticsRow): LogisticsBucketKey | null {
  const hasConsignment = Boolean(order.pathao_consignment_id)
  const stranded =
    order.status === 'cancelled' &&
    hasConsignment &&
    !order.pathao_cancelled_at

  if (stranded) return 'stranded'

  if (
    !hasConsignment &&
    order.status !== 'cancelled' &&
    order.status !== 'pending_payment'
  ) {
    return 'needs_shipping'
  }

  if (!hasConsignment) return null

  if (order.status === 'delivered') return 'delivered'
  if (order.status === 'returned') return 'returned'
  if (order.status === 'cancelled') return 'failed'

  const pathaoKey = normalizePathaoKey(order.pathao_status)
  if (pathaoKey === 'delivered') return 'delivered'
  if (pathaoKey === 'returned') return 'returned'
  if (pathaoKey === 'cancelled' || pathaoKey === 'failed') return 'failed'
  if (pathaoKey === 'in_transit') return 'in_transit'
  if (pathaoKey === 'awaiting_pickup' || pathaoKey === 'submitted') {
    return 'awaiting_pickup'
  }

  if (order.status === 'shipped' || order.status === 'packed') return 'in_transit'
  return 'awaiting_pickup'
}

const BUCKET_META: { key: LogisticsBucketKey; label: string }[] = [
  { key: 'needs_shipping', label: 'Needs shipping' },
  { key: 'awaiting_pickup', label: 'Awaiting pickup' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'returned', label: 'Returned' },
  { key: 'failed', label: 'Failed / cancelled' },
  { key: 'stranded', label: 'Stranded on Pathao' },
]

/**
 * Live logistics snapshot for fulfillment (not date-bounded).
 * Caps at 2000 recent non-pending orders for free-tier safety.
 */
export async function getLogisticsAnalytics(): Promise<LogisticsAnalytics> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, payment_method, full_name, phone, city_name, total, pathao_consignment_id, pathao_status, pathao_error, pathao_cancelled_at, created_at',
    )
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[logistics] orders', error)
  }

  const orders = (data ?? []) as OrderLogisticsRow[]

  const counts = new Map<LogisticsBucketKey, number>()
  for (const meta of BUCKET_META) counts.set(meta.key, 0)

  const pathaoCounts = new Map<string, number>()
  let outstandingCount = 0
  let outstandingAmount = 0
  let collectedCount = 0
  let collectedAmount = 0

  const needsShipping: NeedsShippingRow[] = []
  const activeShipments: ActiveShipmentRow[] = []

  for (const order of orders) {
    const bucket = bucketForOrder(order)
    if (bucket) counts.set(bucket, (counts.get(bucket) ?? 0) + 1)

    if (order.pathao_consignment_id) {
      const label = pathaoStatusLabel(order.pathao_status)
      pathaoCounts.set(label, (pathaoCounts.get(label) ?? 0) + 1)
    }

    if (order.payment_method === 'cod' && order.status !== 'cancelled') {
      if (order.status === 'delivered') {
        collectedCount += 1
        collectedAmount += Number(order.total)
      } else if (order.status !== 'returned') {
        outstandingCount += 1
        outstandingAmount += Number(order.total)
      }
    }

    if (bucket === 'needs_shipping' && needsShipping.length < 50) {
      needsShipping.push({
        id: order.id,
        orderNumber: order.order_number,
        fullName: order.full_name,
        phone: order.phone,
        cityName: order.city_name,
        paymentMethod: order.payment_method,
        total: Number(order.total),
        status: order.status,
        createdAt: order.created_at,
        pathaoError: order.pathao_error,
      })
    }

    if (
      order.pathao_consignment_id &&
      order.status !== 'delivered' &&
      order.status !== 'returned' &&
      order.status !== 'cancelled' &&
      activeShipments.length < 40
    ) {
      activeShipments.push({
        id: order.id,
        orderNumber: order.order_number,
        fullName: order.full_name,
        phone: order.phone,
        cityName: order.city_name,
        paymentMethod: order.payment_method,
        total: Number(order.total),
        status: order.status,
        pathaoStatus: order.pathao_status,
        pathaoStatusLabel: pathaoStatusLabel(order.pathao_status),
        pathaoConsignmentId: order.pathao_consignment_id,
        trackingUrl: pathaoTrackingUrl(order.pathao_consignment_id, order.phone),
        createdAt: order.created_at,
      })
    }
  }

  return {
    buckets: BUCKET_META.map((meta) => ({
      key: meta.key,
      label: meta.label,
      count: counts.get(meta.key) ?? 0,
    })),
    pathaoBreakdown: [...pathaoCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    cod: {
      outstandingCount,
      outstandingAmount,
      collectedCount,
      collectedAmount,
    },
    needsShipping,
    activeShipments,
  }
}
