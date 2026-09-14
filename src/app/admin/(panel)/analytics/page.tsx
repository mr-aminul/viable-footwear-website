import { Suspense } from 'react'
import Link from 'next/link'
import {
  getSalesAnalytics,
  parseRangePreset,
  type DateRangePreset,
} from '@/lib/orders/analytics'
import { getLogisticsAnalytics } from '@/lib/orders/logistics'
import { LogisticsDashboard } from '@/components/admin/LogisticsDashboard'
import { SalesAnalyticsDashboardLazy } from '@/components/admin/SalesAnalyticsDashboardLazy'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ range?: string; tab?: string }>
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams
  const tab = params.tab === 'logistics' ? 'logistics' : 'sales'
  const days = parseRangePreset(params.range)

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Sales performance and live logistics for fulfillment."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        <TabLink
          href={`/admin/analytics?range=${days}`}
          active={tab === 'sales'}
          label="Sales"
        />
        <TabLink
          href="/admin/analytics?tab=logistics"
          active={tab === 'logistics'}
          label="Logistics"
        />
      </div>

      <Suspense fallback={<AnalyticsBodyFallback />}>
        {tab === 'sales' ? (
          <SalesAnalyticsSection days={days} />
        ) : (
          <LogisticsAnalyticsSection />
        )}
      </Suspense>
    </>
  )
}

async function SalesAnalyticsSection({ days }: { days: DateRangePreset }) {
  const sales = await getSalesAnalytics(days)
  return <SalesAnalyticsDashboardLazy data={sales} />
}

async function LogisticsAnalyticsSection() {
  const logistics = await getLogisticsAnalytics()
  return <LogisticsDashboard data={logistics} />
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={[
        'rounded-full px-4 py-2 text-[13px] font-semibold transition',
        active
          ? 'bg-navy text-white'
          : 'border border-cloud bg-white text-ink hover:border-navy/30',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

function AnalyticsBodyFallback() {
  return (
    <div className="mt-6 animate-pulse space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-28 rounded-2xl bg-white/80" />
      </div>
      <div className="h-72 rounded-2xl bg-white/80" />
    </div>
  )
}
