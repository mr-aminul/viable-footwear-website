import { Suspense } from 'react'
import {
  countUndispatchedOrders,
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

  return {
    q: params.q,
    status,
    payment,
    channel,
    city: params.city,
    from: params.from,
    to: params.to,
  }
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const filters = parseFilters(params)

  return (
    <>
      <Suspense fallback={<OrdersHeaderFallback />}>
        <OrdersHeader />
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
