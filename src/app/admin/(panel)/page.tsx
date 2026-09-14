import { Suspense } from 'react'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { getSalesAnalytics } from '@/lib/orders/analytics'
import { countUndispatchedOrders } from '@/lib/orders/queries'

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

/**
 * Shell streams immediately; KPI data loads inside Suspense.
 */
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardData />
    </Suspense>
  )
}

async function DashboardData() {
  const [pendingDispatchCount, sales7] = await Promise.all([
    countUndispatchedOrders(),
    getSalesAnalytics(7),
  ])

  const todayPoint = sales7.series.find((d) => d.date === sales7.to)

  return (
    <AdminDashboard
      pendingDispatchCount={pendingDispatchCount}
      sales7DayGmv={sales7.kpis.gmv}
      sales7DayOrders={sales7.kpis.orderCount}
      ordersToday={todayPoint?.orders ?? 0}
      gmvToday={todayPoint?.gmv ?? 0}
    />
  )
}

function DashboardFallback() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-cloud/80" />
      <div className="h-4 w-80 max-w-full rounded bg-cloud/60" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
      </div>
    </div>
  )
}
