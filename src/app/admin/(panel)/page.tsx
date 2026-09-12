import { Suspense } from 'react'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

/**
 * Tiny server wrapper — dashboard body is client-side (no per-nav data fetch).
 */
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AdminDashboard />
    </Suspense>
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
