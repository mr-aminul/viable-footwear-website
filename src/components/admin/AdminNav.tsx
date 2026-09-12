import Link from 'next/link'
import { signOut } from '@/lib/auth/actions'
import type { StaffProfile } from '@/lib/auth/session'
import { BrandLogo } from '@/components/BrandLogo'

const nav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/catalog', label: 'Catalog' },
  { href: '/admin/orders', label: 'Orders', soon: true },
  { href: '/admin/campaigns', label: 'Campaigns', soon: true },
  { href: '/admin/analytics', label: 'Analytics', soon: true },
]

const adminOnly = [
  { href: '/admin/integrations', label: 'Integrations' },
  { href: '/admin/users', label: 'Users' },
]

export function AdminNav({ profile }: { profile: StaffProfile }) {
  const links =
    profile.role === 'admin' ? [...nav, ...adminOnly] : nav

  return (
    <aside className="flex w-full flex-col border-b border-cloud bg-white lg:min-h-svh lg:w-56 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:flex-col lg:items-start">
        <BrandLogo heightClassName="h-7" />
        <div className="text-[11px] text-mute lg:mt-1">
          {profile.role === 'admin' ? 'Admin' : 'Manager'}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-6">
        {links.map((item) => (
          <Link
            key={item.href}
            href={'soon' in item && item.soon ? '/admin' : item.href}
            className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium text-ink/80 transition hover:bg-mist hover:text-navy"
            title={'soon' in item && item.soon ? 'Coming soon' : undefined}
          >
            {item.label}
            {'soon' in item && item.soon ? (
              <span className="ml-1 text-[10px] text-mute">soon</span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className="mt-auto hidden border-t border-cloud p-4 lg:block">
        <p className="truncate text-[12px] text-mute">{profile.email}</p>
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="text-[13px] font-semibold text-navy hover:underline"
          >
            Sign out
          </button>
        </form>
        <Link
          href="/"
          className="mt-3 block text-[12px] text-mute hover:text-navy"
        >
          ← Storefront
        </Link>
      </div>
    </aside>
  )
}
