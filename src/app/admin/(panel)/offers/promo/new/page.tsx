import { requireRole } from '@/lib/auth/session'
import { listPromoPickerProducts } from '@/lib/catalog/queries'
import { OFFERS_PATH } from '@/lib/offers/paths'
import { PromoForm } from '@/components/admin/PromoForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'New promo code',
  robots: { index: false, follow: false },
}

export default async function NewPromoOfferPage() {
  await requireRole(['admin', 'manager'])
  const catalog = await listPromoPickerProducts()

  return (
    <>
      <AdminPageHeader
        title="New promo code"
        backHref={OFFERS_PATH}
        backLabel="Back to offers"
      />
      <PromoForm catalog={catalog} />
    </>
  )
}
