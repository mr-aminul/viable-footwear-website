import { Suspense } from 'react'
import {
  countUndispatchedOrders,
  listOrderCityNames,
  listOrders,
} from '@/lib/orders/queries'
import type {
  OrderStatus,
  PaymentMethod,
} from '@/lib/supabase/database.types'
import { OrdersFilters } from '@/components/admin/OrdersFilters'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { AdminPageHeader } from '@/components/admin/ui'

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

type SearchParams = {
  q?: string
  status?: string
  payment?: string
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

  return {
    q: params.q,
    status,
    payment,
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
      description={
        <>
          Filter by status, payment, city, or date. Select multiple to dispatch
          to Pathao in bulk, or manage cancel / resend / delete per order.
          {pendingDispatch > 0 ? (
            <span className="mt-1 block font-medium text-navy">
              {pendingDispatch} awaiting Pathao dispatch
            </span>
          ) : null}
        </>
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
  const orders = await listOrders(filters)
  return <OrdersTable orders={orders} />
}

function OrdersHeaderFallback() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-8 w-36 rounded-lg bg-cloud/80" />
      <div className="h-4 w-96 max-w-full rounded bg-cloud/60" />
    </div>
  )
}

function OrdersFiltersFallback() {
  return (
    <div className="mt-6 h-28 animate-pulse rounded-2xl border border-cloud bg-white/80" />
  )
}

function OrdersTableFallback() {
  return (
    <div className="mt-6 h-80 animate-pulse rounded-2xl border border-cloud bg-white/80" />
  )
}
