import { Suspense } from 'react'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { getVisitorStats } from '@/lib/analytics/visitors'
import {
  getSalesAnalytics,
  parseRangePreset,
  type DateRangePreset,
} from '@/lib/orders/analytics'
import { countUndispatchedOrders } from '@/lib/orders/queries'

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ range?: string }>
}

/**
 * Shell streams immediately; KPI data loads inside Suspense.
 */
export default async function AdminDashboardPage({ searchParams }: Props) {
  const params = await searchParams
  const days = parseRangePreset(params.range, 7)

  return (
    <Suspense key={days} fallback={<DashboardFallback />}>
      <DashboardData days={days} />
    </Suspense>
  )
}

async function DashboardData({ days }: { days: DateRangePreset }) {
  const [pendingDispatchCount, sales, visitors] = await Promise.all([
    countUndispatchedOrders(),
    getSalesAnalytics(days),
    getVisitorStats(days),
  ])

  return (
    <AdminDashboard
      days={days}
      pendingDispatchCount={pendingDispatchCount}
      salesGmv={sales.kpis.gmv}
      salesOrders={sales.kpis.orderCount}
      visitorsInRange={visitors.visitorsInRange}
      rangeFrom={sales.from}
      rangeTo={sales.to}
    />
  )
}

function DashboardFallback() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-cloud/80" />
      <div className="h-4 w-80 max-w-full rounded bg-cloud/60" />
      <div className="flex gap-2">
        <div className="h-9 w-16 rounded-full bg-cloud/70" />
        <div className="h-9 w-20 rounded-full bg-cloud/70" />
        <div className="h-9 w-20 rounded-full bg-cloud/70" />
        <div className="h-9 w-20 rounded-full bg-cloud/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
      </div>
    </div>
  )
}
