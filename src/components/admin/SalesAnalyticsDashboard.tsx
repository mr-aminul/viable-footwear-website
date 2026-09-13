'use client'

import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import type { SalesAnalytics } from '@/lib/orders/analytics'
import { adminButtonClassName } from '@/components/admin/ui'

const CHART_NAVY = '#1a2b4a'
const CHART_SPARK = '#e85d3b'
const CHART_MUTE = '#8b95a8'
const MIX_COLORS = [CHART_NAVY, CHART_SPARK, '#3d5a80', '#98c1d9']

export function SalesAnalyticsDashboard({
  data,
}: {
  data: SalesAnalytics
}) {
  const { kpis, series, paymentMix, topProducts, statusFunnel, days, from, to } =
    data

  const exportHref = `/api/admin/orders/export?days=${days}`

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([7, 30, 90] as const).map((preset) => {
            const active = days === preset
            return (
              <Link
                key={preset}
                href={`/admin/analytics?range=${preset}`}
                className={[
                  'rounded-full px-4 py-2 text-[13px] font-semibold transition',
                  active
                    ? 'bg-navy text-white'
                    : 'border border-cloud bg-white text-ink hover:border-navy/30',
                ].join(' ')}
              >
                {preset} days
              </Link>
            )
          })}
        </div>
        <a
          href={exportHref}
          className={adminButtonClassName('secondary')}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Export CSV
        </a>
      </div>

      <p className="text-[13px] text-mute">
        {from} → {to} · GMV excludes cancelled and unpaid orders
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Orders" value={String(kpis.orderCount)} hint="In range" />
        <KpiCard title="GMV" value={formatPrice(Math.round(kpis.gmv))} hint="Gross merchandise" />
        <KpiCard
          title="AOV"
          value={formatPrice(Math.round(kpis.aov))}
          hint="Average order value"
        />
        <KpiCard
          title="Paid vs COD"
          value={`${kpis.paidCount} / ${kpis.codCount}`}
          hint={`${formatPrice(Math.round(kpis.paidGmv))} paid · ${formatPrice(Math.round(kpis.codGmv))} COD`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-cloud bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Sales over time
          </h2>
          <div className="mt-4 h-64 w-full">
            {series.every((d) => d.gmv === 0) ? (
              <EmptyChart message="No sales in this range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: CHART_MUTE, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fill: CHART_MUTE, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatPrice(Math.round(Number(value ?? 0)))}
                    labelFormatter={(label) => String(label)}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e8ecf1',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="gmv" name="GMV" fill={CHART_NAVY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-cloud bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Payment mix
          </h2>
          <div className="mt-4 h-64 w-full">
            {paymentMix.length === 0 ? (
              <EmptyChart message="No paid orders in this range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMix}
                    dataKey="gmv"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {paymentMix.map((entry, index) => (
                      <Cell
                        key={entry.method}
                        fill={MIX_COLORS[index % MIX_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const count = (item?.payload as { count?: number } | undefined)
                        ?.count
                      return [
                        `${formatPrice(Math.round(Number(value ?? 0)))}${
                          count != null ? ` · ${count} orders` : ''
                        }`,
                        'GMV',
                      ]
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e8ecf1',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-[12px] text-ink">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-cloud bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Top products
          </h2>
          {topProducts.length === 0 ? (
            <p className="mt-6 text-[13px] text-mute">No product sales yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-[13px]">
                <thead className="border-b border-cloud text-[11px] uppercase tracking-wider text-mute">
                  <tr>
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 font-semibold">Qty</th>
                    <th className="pb-2 font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((row) => (
                    <tr
                      key={row.productName}
                      className="border-b border-cloud last:border-0"
                    >
                      <td className="py-2.5 font-medium text-ink">
                        {row.productName}
                      </td>
                      <td className="py-2.5 text-mute">{row.quantity}</td>
                      <td className="py-2.5 font-medium">
                        {formatPrice(Math.round(row.revenue))}
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
            Status funnel
          </h2>
          {statusFunnel.length === 0 ? (
            <p className="mt-6 text-[13px] text-mute">No orders in this range.</p>
          ) : (
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusFunnel}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: CHART_MUTE, fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tick={{ fill: CHART_MUTE, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value ?? 0), 'Orders']}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e8ecf1',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Orders" fill={CHART_SPARK} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-cloud bg-white p-5 shadow-card">
      <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
        {title}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-[12px] text-mute">{hint}</p>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[13px] text-mute">
      {message}
    </div>
  )
}
