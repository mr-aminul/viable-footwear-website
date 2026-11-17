import Link from 'next/link'
import type { ReactNode } from 'react'
import { ShoppingBag, Store, Truck } from 'lucide-react'
import type { OrderChannelStats } from '@/lib/orders/queries'

export type OrdersStatActive =
  | 'all'
  | 'website'
  | 'online'
  | 'walk_in'
  | 'dispatch'

function StatCard({
  href,
  label,
  value,
  isActive,
  idle,
  active,
  icon,
}: {
  href: string
  label: string
  value: number
  isActive: boolean
  idle: string
  active: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className={[
        'relative isolate overflow-hidden rounded-2xl px-4 py-4 text-white shadow-card transition',
        isActive ? active : idle,
      ].join(' ')}
    >
      {icon}
      <div className="relative z-[1] pr-14">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-white drop-shadow-sm">
          {value}
        </p>
      </div>
    </Link>
  )
}

function AppIcon({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      width={80}
      height={80}
      decoding="async"
      className="pointer-events-none absolute -bottom-1 -right-1 h-14 w-14 object-contain drop-shadow-md sm:h-16 sm:w-16"
    />
  )
}

function OnlineIcons() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-2 right-2 flex items-end -space-x-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/channels/messenger.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg object-contain drop-shadow-md"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/channels/whatsapp.png"
        alt=""
        width={40}
        height={40}
        className="relative z-[1] h-10 w-10 rounded-lg object-contain drop-shadow-md"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/channels/instagram.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg object-contain drop-shadow-md"
      />
    </div>
  )
}

export function OrdersStatCards({
  stats,
  active,
}: {
  stats: OrderChannelStats
  active?: OrdersStatActive
}) {
  return (
    <div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
      <StatCard
        href="/admin/orders"
        label="All orders"
        value={stats.total}
        isActive={active === 'all'}
        idle="bg-navy hover:bg-navy-deep"
        active="bg-navy-deep ring-2 ring-navy-deep/40 ring-offset-2 ring-offset-sand"
        icon={
          <ShoppingBag
            aria-hidden
            strokeWidth={1.25}
            className="pointer-events-none absolute -bottom-3 -right-2 h-16 w-16 text-white/25 sm:h-20 sm:w-20"
          />
        }
      />
      <StatCard
        href="/admin/orders?channel=website"
        label="Website"
        value={stats.website}
        isActive={active === 'website'}
        idle="bg-[#1e4d8c] hover:bg-[#163a6b]"
        active="bg-[#163a6b] ring-2 ring-[#1e4d8c]/50 ring-offset-2 ring-offset-sand"
        icon={<AppIcon src="/icons/channels/globe.png" />}
      />
      <StatCard
        href="/admin/orders?group=online"
        label="Online orders"
        value={stats.online}
        isActive={active === 'online'}
        idle="bg-[#0f766e] hover:bg-[#0d9488]"
        active="bg-[#0d9488] ring-2 ring-[#0f766e]/50 ring-offset-2 ring-offset-sand"
        icon={<OnlineIcons />}
      />
      <StatCard
        href="/admin/orders?channel=walk_in"
        label="Shop"
        value={stats.walkIn}
        isActive={active === 'walk_in'}
        idle="bg-[#8a6a3b] hover:bg-[#6e5430]"
        active="bg-[#6e5430] ring-2 ring-[#8a6a3b]/50 ring-offset-2 ring-offset-sand"
        icon={
          <Store
            aria-hidden
            strokeWidth={1.25}
            className="pointer-events-none absolute -bottom-3 -right-2 h-16 w-16 text-white/25 sm:h-20 sm:w-20"
          />
        }
      />
      <StatCard
        href="/admin/orders?status=awaiting_fulfillment"
        label="To dispatch"
        value={stats.toDispatch}
        isActive={active === 'dispatch'}
        idle="bg-spark hover:bg-[#c4181e]"
        active="bg-[#c4181e] ring-2 ring-spark/50 ring-offset-2 ring-offset-sand"
        icon={
          <Truck
            aria-hidden
            strokeWidth={1.25}
            className="pointer-events-none absolute -bottom-3 -right-2 h-16 w-16 text-white/25 sm:h-20 sm:w-20"
          />
        }
      />
    </div>
  )
}
