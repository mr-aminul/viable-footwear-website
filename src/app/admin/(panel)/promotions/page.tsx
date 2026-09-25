import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { listPromotionsAdmin } from '@/lib/promotions/queries'
import {
  discountTypeLabel,
  formatPromoDiscountValue,
  promoScheduleLabel,
} from '@/lib/promotions/rules'
import { AdminButton, AdminPageHeader, StatusPill } from '@/components/admin/ui'

export const metadata = {
  title: 'Promotions',
  robots: { index: false, follow: false },
}

export default async function PromotionsPage() {
  await requireRole(['admin', 'manager'])
  const promotions = await listPromotionsAdmin()

  return (
    <>
      <AdminPageHeader
        title="Promotions"
        description="Promo codes customers enter at checkout. Applied to selected products before delivery charges."
        actions={
          <AdminButton href="/admin/promotions/new">New promotion</AdminButton>
        }
      />

      <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Discount</th>
              <th className="px-4 py-3 font-semibold">Products</th>
              <th className="px-4 py-3 font-semibold">Schedule</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-mute">
                  No promotions yet.
                </td>
              </tr>
            ) : (
              promotions.map((promo) => (
                <tr key={promo.id} className="border-b border-cloud last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/promotions/${promo.id}`}
                      className="font-semibold text-navy hover:underline"
                    >
                      {promo.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] tracking-wide">
                    {promo.code}
                  </td>
                  <td className="px-4 py-3 text-mute">
                    {discountTypeLabel(promo.discount_type)} ·{' '}
                    {formatPromoDiscountValue(
                      promo.discount_type,
                      promo.discount_value,
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-mute">
                    {promo.product_ids.length}
                  </td>
                  <td className="px-4 py-3 text-mute">
                    {promoScheduleLabel(promo.starts_at, promo.ends_at)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={promo.active} />
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
