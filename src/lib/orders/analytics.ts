import { createClient } from '@/lib/supabase/server'
import type { OrderStatus, PaymentMethod } from '@/lib/supabase/database.types'

export type DateRangePreset = 7 | 30 | 90

export type SalesKpis = {
  orderCount: number
  gmv: number
  aov: number
  paidCount: number
  codCount: number
  paidGmv: number
  codGmv: number
}

export type SalesDayPoint = {
  date: string
  label: string
  orders: number
  gmv: number
}

export type PaymentMixSlice = {
  method: PaymentMethod
  label: string
  count: number
  gmv: number
}

export type TopProductRow = {
  productName: string
  quantity: number
  revenue: number
}

export type StatusFunnelRow = {
  status: OrderStatus
  label: string
  count: number
}

export type SalesAnalytics = {
  from: string
  to: string
  days: DateRangePreset
  kpis: SalesKpis
  series: SalesDayPoint[]
  paymentMix: PaymentMixSlice[]
  topProducts: TopProductRow[]
  statusFunnel: StatusFunnelRow[]
}

/** Orders that contribute to GMV (exclude unpaid drafts and cancellations). */
const GMV_STATUSES = new Set<OrderStatus>([
  'paid',
  'awaiting_fulfillment',
  'packed',
  'shipped',
  'delivered',
  'returned',
])

type OrderLite = {
  id: string
  status: OrderStatus
  payment_method: PaymentMethod
  total: number
  created_at: string
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function resolveAnalyticsRange(days: DateRangePreset): {
  from: string
  to: string
  fromIso: string
  toIso: string
} {
  const today = startOfUtcDay(new Date())
  const from = addUtcDays(today, -(days - 1))
  const toEnd = addUtcDays(today, 1)
  return {
    from: toIsoDate(from),
    to: toIsoDate(today),
    fromIso: from.toISOString(),
    toIso: toEnd.toISOString(),
  }
}

export function parseRangePreset(raw: string | undefined): DateRangePreset {
  if (raw === '7' || raw === '90') return Number(raw) as DateRangePreset
  return 30
}

function isGmvOrder(order: OrderLite): boolean {
  return GMV_STATUSES.has(order.status)
}

function paymentLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cod':
      return 'COD'
    case 'bkash':
      return 'bKash'
    case 'nagad':
      return 'Nagad'
    default:
      return method
  }
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case 'awaiting_fulfillment':
      return 'To dispatch'
    case 'pending_payment':
      return 'Awaiting payment'
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

export async function getSalesAnalytics(
  days: DateRangePreset,
): Promise<SalesAnalytics> {
  const range = resolveAnalyticsRange(days)
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, payment_method, total, created_at')
    .gte('created_at', range.fromIso)
    .lt('created_at', range.toIso)
    .order('created_at', { ascending: true })
    .limit(5000)

  if (error) {
    console.error('[analytics] orders', error)
  }

  const rows = (orders ?? []) as OrderLite[]
  const gmvOrders = rows.filter(isGmvOrder)

  const orderCount = gmvOrders.length
  const gmv = gmvOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const aov = orderCount > 0 ? gmv / orderCount : 0

  const paidOrders = gmvOrders.filter((o) => o.payment_method !== 'cod')
  const codOrders = gmvOrders.filter((o) => o.payment_method === 'cod')

  const kpis: SalesKpis = {
    orderCount,
    gmv,
    aov,
    paidCount: paidOrders.length,
    codCount: codOrders.length,
    paidGmv: paidOrders.reduce((sum, o) => sum + Number(o.total), 0),
    codGmv: codOrders.reduce((sum, o) => sum + Number(o.total), 0),
  }

  const dayMap = new Map<string, SalesDayPoint>()
  const cursor = new Date(range.fromIso)
  const end = new Date(range.toIso)
  while (cursor < end) {
    const key = toIsoDate(cursor)
    dayMap.set(key, {
      date: key,
      label: cursor.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      orders: 0,
      gmv: 0,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  for (const order of gmvOrders) {
    const key = order.created_at.slice(0, 10)
    const point = dayMap.get(key)
    if (!point) continue
    point.orders += 1
    point.gmv += Number(order.total)
  }

  const series = [...dayMap.values()]

  const mixMap = new Map<PaymentMethod, PaymentMixSlice>()
  for (const method of ['cod', 'bkash', 'nagad'] as PaymentMethod[]) {
    mixMap.set(method, {
      method,
      label: paymentLabel(method),
      count: 0,
      gmv: 0,
    })
  }
  for (const order of gmvOrders) {
    const slice = mixMap.get(order.payment_method)
    if (!slice) continue
    slice.count += 1
    slice.gmv += Number(order.total)
  }
  const paymentMix = [...mixMap.values()].filter((s) => s.count > 0)

  const statusMap = new Map<OrderStatus, number>()
  for (const order of rows) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1)
  }
  const statusFunnel: StatusFunnelRow[] = [...statusMap.entries()]
    .map(([status, count]) => ({
      status,
      label: statusLabel(status),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const gmvIds = gmvOrders.map((o) => o.id)
  const topProducts: TopProductRow[] = []

  if (gmvIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_name, quantity, unit_price, order_id')
      .in('order_id', gmvIds)

    if (itemsError) {
      console.error('[analytics] items', itemsError)
    } else {
      const productMap = new Map<string, TopProductRow>()
      for (const item of items ?? []) {
        const name = item.product_name
        const existing = productMap.get(name) ?? {
          productName: name,
          quantity: 0,
          revenue: 0,
        }
        existing.quantity += item.quantity
        existing.revenue += Number(item.unit_price) * item.quantity
        productMap.set(name, existing)
      }
      topProducts.push(
        ...[...productMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8),
      )
    }
  }

  return {
    from: range.from,
    to: range.to,
    days,
    kpis,
    series,
    paymentMix,
    topProducts,
    statusFunnel,
  }
}

export type OrdersCsvRow = {
  order_number: string
  status: string
  payment_method: string
  full_name: string
  phone: string
  city_name: string
  subtotal: number
  shipping: number
  total: number
  pathao_consignment_id: string | null
  created_at: string
}

export async function listOrdersForCsvExport(
  fromIso: string,
  toIso: string,
): Promise<OrdersCsvRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_number, status, payment_method, full_name, phone, city_name, subtotal, shipping, total, pathao_consignment_id, created_at',
    )
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    console.error('[analytics] csv orders', error)
    return []
  }

  return (data ?? []).map((row) => ({
    order_number: row.order_number,
    status: row.status,
    payment_method: row.payment_method,
    full_name: row.full_name,
    phone: row.phone,
    city_name: row.city_name,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    pathao_consignment_id: row.pathao_consignment_id,
    created_at: row.created_at,
  }))
}

export function ordersToCsv(rows: OrdersCsvRow[]): string {
  const headers = [
    'order_number',
    'status',
    'payment_method',
    'full_name',
    'phone',
    'city_name',
    'subtotal',
    'shipping',
    'total',
    'pathao_consignment_id',
    'created_at',
  ]

  const escape = (value: string | number | null) => {
    const raw = value == null ? '' : String(value)
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
    return raw
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.order_number,
        row.status,
        row.payment_method,
        row.full_name,
        row.phone,
        row.city_name,
        row.subtotal,
        row.shipping,
        row.total,
        row.pathao_consignment_id,
        row.created_at,
      ]
        .map(escape)
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}
