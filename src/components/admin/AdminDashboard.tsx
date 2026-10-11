'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Package,
  Plug,
  ShoppingBag,
  Store,
  Tag,
  Users,
} from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { useStaffProfile } from '@/components/admin/AdminStaffContext'
import {
  rangePresetLabel,
  type DateRangePreset,
} from '@/lib/orders/analytics-range'

const RANGE_PRESETS = [7, 30, 90] as const

/**
 * Soft navigations skip a server data round-trip; role comes from AdminShell.
 */
export default function AdminDashboard({
  days = 7,
  pendingDispatchCount = 0,
  salesGmv = 0,
  salesOrders = 0,
  visitorsInRange = 0,
  rangeFrom,
  rangeTo,
}: {
  days?: DateRangePreset
  pendingDispatchCount?: number
  salesGmv?: number
  salesOrders?: number
  visitorsInRange?: number
  rangeFrom?: string
  rangeTo?: string
}) {
  const profile = useStaffProfile()
  const searchParams = useSearchParams()
  const showAdminOnlyError = searchParams.get('error') === 'admin_only'
  const periodLabel = rangePresetLabel(days)
  const periodHint =
    days === 1
      ? 'Today'
      : rangeFrom && rangeTo
        ? `${rangeFrom} → ${rangeTo}`
        : periodLabel

  const links: QuickLink[] = [
    { href: '/admin/catalog', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/offers', label: 'Offers', icon: Tag },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/', label: 'View storefront', icon: Store },
    ...(profile.role === 'admin'
      ? [
          {
            href: '/admin/integrations',
            label: 'Integrations',
            hint: 'Admin',
            icon: Plug,
          },
          {
            href: '/admin/users',
            label: 'Staff users',
            hint: 'Admin',
            icon: Users,
          },
        ]
      : []),
  ]

  return (
    <>
      {showAdminOnlyError ? (
        <div className="mb-4 rounded-xl border border-spark/30 bg-spark/10 px-4 py-3 text-[13px] text-spark">
          That area is Admin-only.
        </div>
      ) : null}

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
        Dashboard
      </h1>
      <p className="mt-2 max-w-xl text-[14px] text-mute">
        Welcome back
        {profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. Manage
        your catalog and keep the storefront up to date.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/admin?range=today"
          scroll={false}
          className={[
            'rounded-full px-4 py-2 text-[13px] font-semibold transition',
            days === 1
              ? 'bg-navy text-white'
              : 'border border-cloud bg-white text-ink hover:border-navy/30',
          ].join(' ')}
        >
          Today
        </Link>
        {RANGE_PRESETS.map((preset) => {
          const active = days === preset
          return (
            <Link
              key={preset}
              href={`/admin?range=${preset}`}
              scroll={false}
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Sales"
          value={formatPrice(Math.round(salesGmv))}
          hint={`${salesOrders} orders · ${periodHint}`}
          href={`/admin/analytics?range=${days === 1 ? 7 : days}`}
        />
        <KpiCard
          title="Orders"
          value={String(salesOrders)}
          hint={periodLabel}
          href={`/admin/analytics?range=${days === 1 ? 7 : days}`}
        />
        <KpiCard
          title="Visitors"
          value={visitorsInRange.toLocaleString('en-US')}
          hint={periodLabel}
        />
        <KpiCard
          title="To ship"
          value={String(pendingDispatchCount)}
          hint={
            pendingDispatchCount === 0
              ? 'All caught up'
              : 'Awaiting Pathao dispatch'
          }
          href="/admin/analytics?tab=logistics"
        />
      </div>

      <div className="mt-10">
        <h2 className="text-[15px] font-semibold text-ink">Quick links</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((link) => (
            <QuickLinkCard key={link.href} {...link} />
          ))}
        </div>
      </div>
    </>
  )
}

type QuickLink = {
  href: string
  label: string
  hint?: string
  icon: LucideIcon
}

function QuickLinkCard({ href, label, hint, icon: Icon }: QuickLink) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-cloud bg-white p-4 shadow-card transition hover:border-navy/30 hover:bg-mist/40"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy transition group-hover:bg-navy/10">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[12px] text-mute">{hint}</span>
        ) : null}
      </span>
    </Link>
  )
}

function KpiCard({
  title,
  value,
  hint,
  href,
}: {
  title: string
  value: string
  hint: string
  href?: string
}) {
  const body = (
    <>
      <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
        {title}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-[12px] text-mute">{hint}</p>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-cloud bg-white p-5 shadow-card transition hover:border-navy/30 hover:bg-mist/40"
      >
        {body}
      </Link>
    )
  }

  return (
    <div className="rounded-2xl border border-cloud bg-white p-5 shadow-card">
      {body}
    </div>
  )
}
