'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  LayoutDashboard,
  Megaphone,
  Package,
  Plug,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react'
import { signOut } from '@/lib/auth/actions'
import type { StaffProfile } from '@/lib/auth/session'
import { BrandLogo } from '@/components/BrandLogo'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  soon?: boolean
}

const nav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/catalog', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, soon: true },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, soon: true },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, soon: true },
]

const adminOnly: NavItem[] = [
  { href: '/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/users', label: 'Users', icon: Users },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

type AdminNavProps = {
  profile: StaffProfile
  /** Mobile drawer presentation (fixed overlay). */
  variant?: 'desktop' | 'mobile'
  isOpen?: boolean
  onClose?: () => void
}

/**
 * Admin sidebar rail. Desktop: flex sibling of the content card (stays put
 * because the shell does not scroll). Mobile: fixed off-canvas drawer.
 */
export function AdminNav({
  profile,
  variant = 'desktop',
  isOpen = false,
  onClose,
}: AdminNavProps) {
  const pathname = usePathname()
  const links =
    profile.role === 'admin' ? [...nav, ...adminOnly] : nav
  const isMobile = variant === 'mobile'

  return (
    <aside
      id={isMobile ? 'admin-mobile-nav' : undefined}
      aria-hidden={isMobile ? !isOpen : undefined}
      className={
        isMobile
          ? [
              'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-navy shadow-lift transition-transform duration-200 ease-out',
              isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
            ].join(' ')
          : 'hidden h-full w-56 shrink-0 flex-col overflow-hidden text-white lg:flex'
      }
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <BrandLogo variant="light" heightClassName="h-7" />
          <p className="mt-1 text-[11px] text-white/70">
            {profile.role === 'admin' ? 'Admin' : 'Manager'}
          </p>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((item) => {
          const soon = Boolean(item.soon)
          const href = soon ? '/admin' : item.href
          const active = !soon && isActive(pathname, item.href, item.exact)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={href}
              prefetch={soon ? false : true}
              onClick={onClose}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
              title={soon ? 'Coming soon' : undefined}
            >
              <Icon
                size={16}
                strokeWidth={2}
                className={active ? 'text-white' : 'text-white/55'}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {soon ? (
                <span className="text-[10px] text-white/45">soon</span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/15 p-4">
        <p className="truncate text-[12px] text-white/55">{profile.email}</p>
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="text-[13px] font-semibold text-white hover:underline"
          >
            Sign out
          </button>
        </form>
        <Link
          href="/"
          prefetch={false}
          onClick={onClose}
          className="mt-3 block text-[12px] text-white/55 hover:text-white"
        >
          ← Storefront
        </Link>
      </div>
    </aside>
  )
}
