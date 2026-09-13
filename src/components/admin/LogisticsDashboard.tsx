import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import type { LogisticsAnalytics } from '@/lib/orders/logistics'
import { storeStatusLabel } from '@/lib/orders/status-labels'

export function LogisticsDashboard({ data }: { data: LogisticsAnalytics }) {
  const { buckets, pathaoBreakdown, cod, needsShipping, activeShipments } = data

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {buckets.slice(0, 4).map((bucket) => (
          <div
            key={bucket.key}
            className="rounded-2xl border border-cloud bg-white p-5 shadow-card"
          >
            <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
              {bucket.label}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold text-ink">
              {bucket.count}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {buckets.slice(4).map((bucket) => (
          <div
            key={bucket.key}
            className="rounded-2xl border border-cloud bg-white p-5"
          >
            <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
              {bucket.label}
            </p>
            <p className="mt-2 font-display text-2xl font-extrabold text-ink">
              {bucket.count}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-cloud bg-white p-5 shadow-card">
          <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
            COD outstanding
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink">
            {formatPrice(Math.round(cod.outstandingAmount))}
          </p>
          <p className="mt-1 text-[12px] text-mute">
            {cod.outstandingCount} open COD order
            {cod.outstandingCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-2xl border border-cloud bg-white p-5 shadow-card">
          <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
            COD collected
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink">
            {formatPrice(Math.round(cod.collectedAmount))}
          </p>
          <p className="mt-1 text-[12px] text-mute">
            {cod.collectedCount} delivered COD order
            {cod.collectedCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-cloud bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
              Needs shipping
            </h2>
            <Link
              href="/admin/orders?status=awaiting_fulfillment"
              className="text-[12px] font-semibold text-navy hover:underline"
            >
              View orders
            </Link>
          </div>
          {needsShipping.length === 0 ? (
            <p className="mt-6 text-[13px] text-mute">
              Nothing waiting for Pathao dispatch.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead className="border-b border-cloud text-[11px] uppercase tracking-wider text-mute">
                  <tr>
                    <th className="pb-2 font-semibold">Order</th>
                    <th className="pb-2 font-semibold">Customer</th>
                    <th className="pb-2 font-semibold">Total</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {needsShipping.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-cloud last:border-0"
                    >
                      <td className="py-2.5">
                        <Link
                          href={`/admin/orders/${row.id}`}
                          className="font-semibold text-navy hover:underline"
                        >
                          {row.orderNumber}
                        </Link>
                        <p className="text-[11px] text-mute">{row.cityName}</p>
                        {row.pathaoError ? (
                          <p className="text-[11px] text-spark">{row.pathaoError}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5">
                        <p className="font-medium text-ink">{row.fullName}</p>
                        <p className="text-mute">{row.phone}</p>
                      </td>
                      <td className="py-2.5 font-medium">
                        {formatPrice(row.total)}
                        <p className="text-[11px] uppercase text-mute">
                          {row.paymentMethod}
                        </p>
                      </td>
                      <td className="py-2.5 text-mute">
                        {storeStatusLabel(row.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-cloud bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Pathao status breakdown
          </h2>
          {pathaoBreakdown.length === 0 ? (
            <p className="mt-6 text-[13px] text-mute">
              No consignments created yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {pathaoBreakdown.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-xl bg-mist/50 px-3 py-2 text-[13px]"
                >
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="font-semibold text-navy">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <div className="border-b border-cloud px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Active Pathao shipments
          </h2>
        </div>
        {activeShipments.length === 0 ? (
          <p className="px-4 py-8 text-[13px] text-mute">
            No in-flight consignments.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Pathao</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {activeShipments.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-cloud last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${row.id}`}
                      className="font-semibold text-navy hover:underline"
                    >
                      {row.orderNumber}
                    </Link>
                    <p className="font-mono text-[11px] text-mute">
                      {row.pathaoConsignmentId}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{row.fullName}</p>
                    <p className="text-mute">
                      {row.cityName} · {row.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{row.pathaoStatusLabel}</p>
                    <p className="text-[11px] text-mute">
                      Store: {storeStatusLabel(row.status)}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatPrice(row.total)}
                    <p className="text-[11px] uppercase text-mute">
                      {row.paymentMethod}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {row.trackingUrl ? (
                      <a
                        href={row.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-navy hover:underline"
                      >
                        Track
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
