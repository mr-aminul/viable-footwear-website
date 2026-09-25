import { requireRole } from '@/lib/auth/session'
import { listPromoPickerProducts } from '@/lib/catalog/queries'
import { PromoForm } from '@/components/admin/PromoForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'New promotion',
  robots: { index: false, follow: false },
}

export default async function NewPromotionPage() {
  await requireRole(['admin', 'manager'])
  const catalog = await listPromoPickerProducts()

  return (
    <>
      <AdminPageHeader
        title="New promotion"
        backHref="/admin/promotions"
        backLabel="Back to promotions"
      />
      <PromoForm catalog={catalog} />
    </>
  )
}
