'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  ShoppingBag,
  Store,
  Users,
  X,
} from 'lucide-react'
import { signOut } from '@/lib/auth/actions'
import { toggleSidebarPinned } from '@/lib/admin/sidebarPrefs'
import type { StaffProfile } from '@/lib/auth/session'
import { useSidebarPrefs } from '@/components/admin/useSidebarPrefs'

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
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, soon: true },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, soon: true },
]

const adminOnly: NavItem[] = [
  { href: '/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/users', label: 'Users', icon: Users },
]

const SIDEBAR_WIDTH_COLLAPSED = '4rem'
const SIDEBAR_WIDTH_EXPANDED = '14rem'
const HOVER_CLOSE_DELAY_MS = 140
const NAV_ICON_SIZE = 16
const NAV_ICON_STROKE = 2

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

function NavLinkItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const soon = Boolean(item.soon)
  const href = soon ? '/admin' : item.href
  const active = !soon && isActive(pathname, item.href, item.exact)
  const Icon = item.icon
  const tooltip = soon ? `${item.label} · Coming soon` : item.label

  return (
    <Link
      href={href}
      prefetch={soon ? false : true}
      onClick={onNavigate}
      title={collapsed ? tooltip : soon ? 'Coming soon' : undefined}
      aria-label={collapsed ? tooltip : undefined}
      className={[
        'flex items-center rounded-lg text-[13px] font-medium transition',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
        active
          ? 'bg-white/15 text-white'
          : 'text-white/75 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      <Icon
        size={NAV_ICON_SIZE}
        strokeWidth={NAV_ICON_STROKE}
        className={[
          'shrink-0',
          active ? 'text-white' : 'text-white/55',
        ].join(' ')}
        aria-hidden
      />
      <span
        className={[
          'min-w-0 flex-1 truncate transition-opacity duration-200',
          collapsed ? 'sr-only' : 'opacity-100',
        ].join(' ')}
        aria-hidden={collapsed}
      >
        {item.label}
      </span>
      {soon && !collapsed ? (
        <span className="text-[10px] text-white/45">Soon</span>
      ) : null}
    </Link>
  )
}

/**
 * Admin sidebar rail. Desktop: collapsible like FN appshell (auto hover or
 * pinned). Mobile: fixed off-canvas drawer.
 */
export function AdminNav({
  profile,
  variant = 'desktop',
  isOpen = false,
  onClose,
}: AdminNavProps) {
  const pathname = usePathname()
  const { mode, expanded } = useSidebarPrefs()
  const [hovered, setHovered] = useState(false)
  const hoverCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const links =
    profile.role === 'admin' ? [...nav, ...adminOnly] : nav
  const isMobile = variant === 'mobile'
  const isManual = mode === 'manual'
  const collapsed = isMobile ? false : isManual ? !expanded : !hovered

  const clearHoverClose = () => {
    if (hoverCloseRef.current) {
      clearTimeout(hoverCloseRef.current)
      hoverCloseRef.current = null
    }
  }

  useEffect(() => () => clearHoverClose(), [])

  useEffect(() => {
    if (isManual) {
      clearHoverClose()
      setHovered(false)
    }
  }, [isManual])

  const togglePinned = () => {
    toggleSidebarPinned(collapsed, isManual)
  }

  const brand = (
    <div className="flex h-[4.5rem] shrink-0 items-center gap-2.5 px-3">
      <Link
        href="/admin"
        prefetch={false}
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        aria-label="Viable admin"
        title="Viable admin"
      >
        <img
          src="/favicon.svg"
          alt=""
          className="h-8 w-8 object-contain"
          width={32}
          height={32}
          decoding="async"
        />
      </Link>
      <div
        className={[
          'min-w-0 flex-1 overflow-hidden transition-[opacity,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed
            ? 'pointer-events-none w-0 opacity-0'
            : 'w-auto opacity-100',
        ].join(' ')}
        aria-hidden={collapsed}
      >
        <p className="truncate text-[14px] font-semibold tracking-tight text-white">
          Viable {profile.role === 'admin' ? 'Admin' : 'Manager'}
        </p>
      </div>
      {isMobile ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Close menu"
        >
          <X size={18} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )

  const navLinks = (
    <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((item) => (
        <NavLinkItem
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onClose}
        />
      ))}
    </nav>
  )

  const footer = (
    <div
      className={[
        'border-t border-white/15',
        collapsed ? 'flex flex-col items-center gap-1 p-2' : 'p-3',
      ].join(' ')}
    >
      {!collapsed ? (
        <p className="truncate text-[12px] text-white/55">{profile.email}</p>
      ) : null}

      <div
        className={[
          'flex',
          collapsed ? 'flex-col items-center gap-1' : 'mt-2 items-center gap-2',
        ].join(' ')}
      >
        <form action={signOut} className={collapsed ? '' : 'flex-1'}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className={[
              'rounded-lg text-[13px] font-semibold text-white transition hover:bg-white/10',
              collapsed
                ? 'flex h-9 w-9 items-center justify-center'
                : 'hover:underline',
            ].join(' ')}
          >
            {collapsed ? (
              <LogOut size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} aria-hidden />
            ) : (
              'Sign out'
            )}
          </button>
        </form>

        <Link
          href="/"
          prefetch={false}
          onClick={onClose}
          title="Storefront"
          aria-label="Storefront"
          className={[
            'rounded-lg text-[12px] text-white/55 transition hover:bg-white/10 hover:text-white',
            collapsed
              ? 'flex h-9 w-9 items-center justify-center'
              : 'block',
          ].join(' ')}
        >
          {collapsed ? (
            <Store size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} aria-hidden />
          ) : (
            '← Storefront'
          )}
        </Link>
      </div>

      {!isMobile ? (
        <button
          type="button"
          onClick={togglePinned}
          aria-label={
            collapsed
              ? 'Expand sidebar'
              : isManual
                ? 'Collapse sidebar'
                : 'Keep sidebar expanded'
          }
          aria-expanded={!collapsed}
          title={
            collapsed
              ? 'Expand sidebar'
              : isManual
                ? 'Collapse sidebar (hover to expand)'
                : 'Keep sidebar expanded'
          }
          className={[
            'rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white',
            collapsed
              ? 'mt-1 flex h-9 w-9 items-center justify-center'
              : 'mt-3 flex w-full items-center gap-2 px-2 py-1.5 text-[12px] font-medium',
          ].join(' ')}
        >
          {collapsed ? (
            <PanelLeftOpen
              size={NAV_ICON_SIZE}
              strokeWidth={NAV_ICON_STROKE}
              aria-hidden
            />
          ) : isManual ? (
            <>
              <PanelLeftClose
                size={NAV_ICON_SIZE}
                strokeWidth={NAV_ICON_STROKE}
                aria-hidden
              />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <PanelLeftOpen
                size={NAV_ICON_SIZE}
                strokeWidth={NAV_ICON_STROKE}
                aria-hidden
              />
              <span>Keep open</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  )

  if (isMobile) {
    return (
      <aside
        id="admin-mobile-nav"
        aria-hidden={!isOpen}
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-navy shadow-lift transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        ].join(' ')}
      >
        {brand}
        {navLinks}
        {footer}
      </aside>
    )
  }

  return (
    <aside
      className="hidden h-full shrink-0 flex-col overflow-hidden text-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex"
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
      onMouseEnter={
        isManual
          ? undefined
          : () => {
            clearHoverClose()
            setHovered(true)
          }
      }
      onMouseLeave={
        isManual
          ? undefined
          : () => {
            clearHoverClose()
            hoverCloseRef.current = setTimeout(
              () => setHovered(false),
              HOVER_CLOSE_DELAY_MS,
            )
          }
      }
    >
      {brand}
      {navLinks}
      {footer}
    </aside>
  )
}
