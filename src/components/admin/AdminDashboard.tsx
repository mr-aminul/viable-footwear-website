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
  Ticket,
  Users,
} from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { useStaffProfile } from '@/components/admin/AdminStaffContext'

/**
 * Soft navigations skip a server data round-trip; role comes from AdminShell.
 */
export default function AdminDashboard({
  pendingDispatchCount = 0,
  sales7DayGmv = 0,
  sales7DayOrders = 0,
  ordersToday = 0,
  gmvToday = 0,
}: {
  pendingDispatchCount?: number
  sales7DayGmv?: number
  sales7DayOrders?: number
  ordersToday?: number
  gmvToday?: number
}) {
  const profile = useStaffProfile()
  const searchParams = useSearchParams()
  const showAdminOnlyError = searchParams.get('error') === 'admin_only'

  const links: QuickLink[] = [
    { href: '/admin/catalog', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/promotions', label: 'Promotions', icon: Ticket },
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Sales (7d)"
          value={formatPrice(Math.round(sales7DayGmv))}
          hint={`${sales7DayOrders} orders · last 7 days`}
          href="/admin/analytics?range=7"
        />
        <KpiCard
          title="Orders today"
          value={String(ordersToday)}
          hint={
            ordersToday === 0
              ? 'No orders yet today'
              : `${formatPrice(Math.round(gmvToday))} GMV today`
          }
          href="/admin/analytics?range=7"
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
