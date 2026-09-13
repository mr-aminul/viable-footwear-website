import Link from 'next/link'
import { inputClassName } from '@/components/admin/ui'
import { storeStatusLabel } from '@/lib/orders/status-labels'
import type {
  OrderStatus,
  PaymentMethod,
} from '@/lib/supabase/database.types'

const STATUS_OPTIONS: OrderStatus[] = [
  'pending_payment',
  'paid',
  'awaiting_fulfillment',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]

const PAYMENT_OPTIONS: PaymentMethod[] = ['cod', 'bkash', 'nagad']

export type OrdersFilterValues = {
  q?: string
  status?: string
  payment?: string
  city?: string
  from?: string
  to?: string
}

export function OrdersFilters({
  values,
  cities,
}: {
  values: OrdersFilterValues
  cities: string[]
}) {
  const hasFilters = Boolean(
    values.q ||
      values.status ||
      values.payment ||
      values.city ||
      values.from ||
      values.to,
  )

  return (
    <form
      method="get"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-cloud bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="xl:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Search
          </span>
          <input
            name="q"
            defaultValue={values.q ?? ''}
            placeholder="Order #, name, or phone"
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Status
          </span>
          <select
            name="status"
            defaultValue={values.status ?? ''}
            className={`${inputClassName} mt-1`}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {storeStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Payment
          </span>
          <select
            name="payment"
            defaultValue={values.payment ?? ''}
            className={`${inputClassName} mt-1`}
          >
            <option value="">All</option>
            {PAYMENT_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            City
          </span>
          <select
            name="city"
            defaultValue={values.city ?? ''}
            className={`${inputClassName} mt-1`}
          >
            <option value="">All</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            From
          </span>
          <input
            type="date"
            name="from"
            defaultValue={values.from ?? ''}
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            To
          </span>
          <input
            type="date"
            name="to"
            defaultValue={values.to ?? ''}
            className={`${inputClassName} mt-1`}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy-deep"
        >
          Apply filters
        </button>
        {hasFilters ? (
          <Link
            href="/admin/orders"
            className="text-[13px] font-semibold text-navy hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  )
}
