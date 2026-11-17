import { Suspense } from 'react'
import {
  countUndispatchedOrders,
  getOrderChannelStats,
  listOrderCityNames,
  listOrders,
} from '@/lib/orders/queries'
import { expireAbandonedPendingOrders } from '@/lib/orders/expire-pending'
import type {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
} from '@/lib/db/database.types'
import { ORDER_CHANNELS } from '@/lib/orders/channels'
import { OrdersFilters } from '@/components/admin/OrdersFilters'
import {
  OrdersStatCards,
  type OrdersStatActive,
} from '@/components/admin/OrdersStatCards'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { AdminButton, AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
}

const STATUS_SET = new Set<OrderStatus>([
  'new',
  'pending_payment',
  'paid',
  'awaiting_fulfillment',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
])

const PAYMENT_SET = new Set<PaymentMethod>(['cod', 'bkash', 'nagad'])
const CHANNEL_SET = new Set<OrderChannel>(ORDER_CHANNELS)

type SearchParams = {
  q?: string
  status?: string
  payment?: string
  channel?: string
  group?: string
  city?: string
  from?: string
  to?: string
}

type Props = {
  searchParams: Promise<SearchParams>
}

function parseFilters(params: SearchParams) {
  const status =
    params.status && STATUS_SET.has(params.status as OrderStatus)
      ? (params.status as OrderStatus)
      : undefined
  const payment =
    params.payment && PAYMENT_SET.has(params.payment as PaymentMethod)
      ? (params.payment as PaymentMethod)
      : undefined
  const channel =
    params.channel && CHANNEL_SET.has(params.channel as OrderChannel)
      ? (params.channel as OrderChannel)
      : undefined
  const channelGroup =
    !channel && params.group === 'online'
      ? ('online' as const)
      : !channel && params.group === 'other'
        ? ('other' as const)
        : undefined

  return {
    q: params.q,
    status,
    payment,
    channel,
    channelGroup,
    city: params.city,
    from: params.from,
    to: params.to,
  }
}

function activeStatKey(params: SearchParams): OrdersStatActive {
  if (
    params.status === 'awaiting_fulfillment' &&
    !params.channel &&
    !params.group
  ) {
    return 'dispatch'
  }
  if (params.group === 'online' && !params.channel) return 'online'
  if (params.channel === 'website') return 'website'
  if (params.channel === 'walk_in') return 'walk_in'
  return 'all'
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const filters = parseFilters(params)

  return (
    <>
      <Suspense fallback={<OrdersHeaderFallback />}>
        <OrdersHeader />
      </Suspense>

      <Suspense fallback={<OrdersStatsFallback />}>
        <OrdersStatsSection active={activeStatKey(params)} />
      </Suspense>

      <Suspense fallback={<OrdersFiltersFallback />}>
        <OrdersFiltersSection values={params} />
      </Suspense>

      <Suspense fallback={<OrdersTableFallback />}>
        <OrdersTableSection filters={filters} />
      </Suspense>
    </>
  )
}

async function OrdersHeader() {
  const pendingDispatch = await countUndispatchedOrders()

  return (
    <AdminPageHeader
      title="Orders"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {pendingDispatch > 0 ? (
            <span className="rounded-full bg-navy/10 px-2.5 py-1 text-[12px] font-medium text-navy">
              {pendingDispatch} to dispatch
            </span>
          ) : null}
          <AdminButton href="/admin/orders/import" variant="secondary">
            Add / import
          </AdminButton>
        </div>
      }
    />
  )
}

async function OrdersStatsSection({ active }: { active: OrdersStatActive }) {
  const stats = await getOrderChannelStats()
  return <OrdersStatCards stats={stats} active={active} />
}

async function OrdersFiltersSection({ values }: { values: SearchParams }) {
  const cities = await listOrderCityNames()
  return <OrdersFilters values={values} cities={cities} />
}

async function OrdersTableSection({
  filters,
}: {
  filters: ReturnType<typeof parseFilters>
}) {
  await expireAbandonedPendingOrders()
  const orders = await listOrders(filters)
  return <OrdersTable orders={orders} />
}

function OrdersHeaderFallback() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-28 rounded-lg bg-cloud/80" />
    </div>
  )
}

function OrdersStatsFallback() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-[4.75rem] animate-pulse rounded-2xl bg-cloud/70"
        />
      ))}
    </div>
  )
}

function OrdersFiltersFallback() {
  return (
    <div className="mt-4 h-8 animate-pulse rounded-lg bg-cloud/60" />
  )
}

function OrdersTableFallback() {
  return (
    <div className="mt-4 h-80 animate-pulse rounded-2xl border border-cloud bg-white/80" />
  )
}
