'use client'

import dynamic from 'next/dynamic'
import type { SalesAnalytics } from '@/lib/orders/analytics'

const SalesAnalyticsDashboard = dynamic(
  () =>
    import('@/components/admin/SalesAnalyticsDashboard').then(
      (mod) => mod.SalesAnalyticsDashboard,
    ),
  {
    loading: () => (
      <div className="mt-6 animate-pulse space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-white/80" />
          <div className="h-28 rounded-2xl bg-white/80" />
          <div className="h-28 rounded-2xl bg-white/80" />
        </div>
        <div className="h-72 rounded-2xl bg-white/80" />
      </div>
    ),
  },
)

/** Defers recharts until the sales tab actually mounts. */
export function SalesAnalyticsDashboardLazy({
  data,
}: {
  data: SalesAnalytics
}) {
  return <SalesAnalyticsDashboard data={data} />
}
