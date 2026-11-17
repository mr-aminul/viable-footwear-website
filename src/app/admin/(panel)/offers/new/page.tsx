import Link from 'next/link'
import { Megaphone, Ticket } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { OFFERS_PATH, offerDeliveryPath, offerPromoPath } from '@/lib/offers/paths'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'New offer',
  robots: { index: false, follow: false },
}

const types = [
  {
    href: offerDeliveryPath(),
    title: 'Delivery offer',
    description: 'Shipping rules at checkout.',
    icon: Megaphone,
  },
  {
    href: offerPromoPath(),
    title: 'Promo code',
    description: 'Discount code at checkout.',
    icon: Ticket,
  },
] as const

export default async function NewOfferPage() {
  await requireRole(['admin', 'manager'])

  return (
    <>
      <AdminPageHeader
        title="New offer"
        backHref={OFFERS_PATH}
        backLabel="Back to offers"
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {types.map((type) => {
          const Icon = type.icon
          return (
            <Link
              key={type.href}
              href={type.href}
              className="group rounded-2xl border border-cloud bg-white px-5 py-6 transition hover:border-navy/25 hover:bg-mist/30"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy transition group-hover:bg-navy group-hover:text-white">
                <Icon size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="mt-4 block text-[16px] font-semibold text-ink">
                {type.title}
              </span>
              <span className="mt-1.5 block text-[13px] leading-relaxed text-mute">
                {type.description}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
