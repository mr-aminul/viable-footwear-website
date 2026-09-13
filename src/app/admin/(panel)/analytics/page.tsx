import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import {
  getSalesAnalytics,
  parseRangePreset,
} from '@/lib/orders/analytics'
import { getLogisticsAnalytics } from '@/lib/orders/logistics'
import { LogisticsDashboard } from '@/components/admin/LogisticsDashboard'
import { SalesAnalyticsDashboard } from '@/components/admin/SalesAnalyticsDashboard'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ range?: string; tab?: string }>
}

export default async function AnalyticsPage({ searchParams }: Props) {
  await requireRole(['admin', 'manager'])
  const params = await searchParams
  const tab = params.tab === 'logistics' ? 'logistics' : 'sales'
  const days = parseRangePreset(params.range)

  const [sales, logistics] = await Promise.all([
    tab === 'sales' ? getSalesAnalytics(days) : Promise.resolve(null),
    tab === 'logistics' ? getLogisticsAnalytics() : Promise.resolve(null),
  ])

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

      {tab === 'sales' && sales ? (
        <SalesAnalyticsDashboard data={sales} />
      ) : null}
      {tab === 'logistics' && logistics ? (
        <LogisticsDashboard data={logistics} />
      ) : null}
    </>
  )
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
