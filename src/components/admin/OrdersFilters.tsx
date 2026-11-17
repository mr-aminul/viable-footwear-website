import Link from 'next/link'
import {
  ORDER_CHANNELS,
  orderChannelLabel,
} from '@/lib/orders/channels'
import { storeStatusLabel } from '@/lib/orders/status-labels'
import type {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
} from '@/lib/db/database.types'

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

const fieldClassName =
  'h-8 shrink-0 rounded-lg border border-cloud bg-white px-2.5 text-[12px] text-ink outline-none transition placeholder:text-mute focus:border-navy'

export type OrdersFilterValues = {
  q?: string
  status?: string
  payment?: string
  channel?: string
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
      values.channel ||
      values.city ||
      values.from ||
      values.to,
  )

  return (
    <form
      method="get"
      className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1"
    >
      <input
        name="q"
        defaultValue={values.q ?? ''}
        placeholder="Search order #, name, phone"
        aria-label="Search"
        className={`${fieldClassName} w-52`}
      />
      <select
        name="channel"
        defaultValue={values.channel ?? ''}
        aria-label="Channel"
        className={`${fieldClassName} w-28`}
      >
        <option value="">Channel</option>
        {ORDER_CHANNELS.map((channel) => (
          <option key={channel} value={channel}>
            {orderChannelLabel(channel as OrderChannel)}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue={values.status ?? ''}
        aria-label="Status"
        className={`${fieldClassName} w-32`}
      >
        <option value="">Status</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {storeStatusLabel(status)}
          </option>
        ))}
      </select>
      <select
        name="payment"
        defaultValue={values.payment ?? ''}
        aria-label="Payment"
        className={`${fieldClassName} w-24`}
      >
        <option value="">Payment</option>
        {PAYMENT_OPTIONS.map((method) => (
          <option key={method} value={method}>
            {method.toUpperCase()}
          </option>
        ))}
      </select>
      <select
        name="city"
        defaultValue={values.city ?? ''}
        aria-label="City"
        className={`${fieldClassName} w-28`}
      >
        <option value="">City</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      <input
        type="date"
        name="from"
        defaultValue={values.from ?? ''}
        aria-label="From date"
        className={`${fieldClassName} w-32`}
      />
      <input
        type="date"
        name="to"
        defaultValue={values.to ?? ''}
        aria-label="To date"
        className={`${fieldClassName} w-32`}
      />
      <button
        type="submit"
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-navy px-3 text-[12px] font-semibold text-white transition hover:bg-navy-deep"
      >
        Apply
      </button>
      {hasFilters ? (
        <Link
          href="/admin/orders"
          className="shrink-0 text-[12px] font-semibold text-navy hover:underline"
        >
          Clear
        </Link>
      ) : null}
    </form>
  )
}
