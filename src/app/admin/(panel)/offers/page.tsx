import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { listCampaignsAdmin } from '@/lib/campaigns/queries'
import {
  parseCampaignRules,
  ruleTypeLabel,
} from '@/lib/campaigns/rules'
import { OFFERS_PATH, offerDeliveryPath, offerPromoPath } from '@/lib/offers/paths'
import { listPromotionsAdmin } from '@/lib/promotions/queries'
import {
  discountTypeLabel,
  formatPromoDiscountValue,
  promoScheduleLabel,
} from '@/lib/promotions/rules'
import { AdminButton, AdminPageHeader, StatusPill } from '@/components/admin/ui'

export const metadata = {
  title: 'Offers',
  robots: { index: false, follow: false },
}

type OfferListItem = {
  kind: 'delivery' | 'promo'
  id: string
  title: string
  typeLabel: string
  detail: string
  active: boolean
  href: string
  sortAt: string
}

export default async function OffersPage() {
  await requireRole(['admin', 'manager'])
  const [campaigns, promotions] = await Promise.all([
    listCampaignsAdmin(),
    listPromotionsAdmin(),
  ])

  const items: OfferListItem[] = [
    ...campaigns.map((c) => {
      const rules = parseCampaignRules(c.rules)
      return {
        kind: 'delivery' as const,
        id: c.id,
        title: c.name,
        typeLabel: 'Delivery',
        detail: rules ? ruleTypeLabel(rules.type) : '—',
        active: c.active,
        href: offerDeliveryPath(c.id),
        sortAt: c.updated_at || c.created_at,
      }
    }),
    ...promotions.map((promo) => ({
      kind: 'promo' as const,
      id: promo.id,
      title: promo.title,
      typeLabel: 'Promo code',
      detail: [
        promo.code,
        `${discountTypeLabel(promo.discount_type)} · ${formatPromoDiscountValue(
          promo.discount_type,
          promo.discount_value,
        )}`,
        promo.product_ids.length === 0
          ? 'All products'
          : `${promo.product_ids.length} products`,
        promoScheduleLabel(promo.starts_at, promo.ends_at),
      ].join(' · '),
      active: promo.active,
      href: offerPromoPath(promo.id),
      sortAt: promo.updated_at || promo.created_at,
    })),
  ].sort((a, b) => {
    const byDate = b.sortAt.localeCompare(a.sortAt)
    if (byDate !== 0) return byDate
    return a.title.localeCompare(b.title)
  })

  return (
    <>
      <AdminPageHeader
        title="Offers"
        description="Customer value in one place — automatic delivery deals and checkout promo codes."
        actions={
          <AdminButton href={`${OFFERS_PATH}/new`}>New offer</AdminButton>
        }
      />

      <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-mute">
                  No offers yet.{' '}
                  <Link
                    href={`${OFFERS_PATH}/new`}
                    className="font-semibold text-navy hover:underline"
                  >
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="border-b border-cloud last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={item.href}
                      className="font-semibold text-navy hover:underline"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-mute">{item.typeLabel}</td>
                  <td className="px-4 py-3 text-mute">{item.detail}</td>
                  <td className="px-4 py-3">
                    <StatusPill active={item.active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
