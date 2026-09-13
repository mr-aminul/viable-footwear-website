import { requireRole } from '@/lib/auth/session'
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

type Props = {
  searchParams: Promise<{
    q?: string
    status?: string
    payment?: string
    city?: string
    from?: string
    to?: string
  }>
}

export default async function OrdersPage({ searchParams }: Props) {
  await requireRole(['admin', 'manager'])
  const params = await searchParams

  const status =
    params.status && STATUS_SET.has(params.status as OrderStatus)
      ? (params.status as OrderStatus)
      : undefined
  const payment =
    params.payment && PAYMENT_SET.has(params.payment as PaymentMethod)
      ? (params.payment as PaymentMethod)
      : undefined

  const [orders, pendingDispatch, cities] = await Promise.all([
    listOrders({
      q: params.q,
      status,
      payment,
      city: params.city,
      from: params.from,
      to: params.to,
    }),
    countUndispatchedOrders(),
    listOrderCityNames(),
  ])

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description={
          <>
            Filter by status, payment, city, or date. Select multiple to
            dispatch to Pathao in bulk, or manage cancel / resend / delete per
            order.
            {pendingDispatch > 0 ? (
              <span className="mt-1 block font-medium text-navy">
                {pendingDispatch} awaiting Pathao dispatch
              </span>
            ) : null}
          </>
        }
      />

      <OrdersFilters
        values={{
          q: params.q,
          status: params.status,
          payment: params.payment,
          city: params.city,
          from: params.from,
          to: params.to,
        }}
        cities={cities}
      />

      <OrdersTable
        orders={orders.map(({ items: _items, ...order }) => order)}
      />
    </>
  )
}
