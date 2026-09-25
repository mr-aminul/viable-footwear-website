import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/session'
import { listPromoPickerProducts } from '@/lib/catalog/queries'
import { getPromotionById } from '@/lib/promotions/queries'
import { PromoForm } from '@/components/admin/PromoForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Edit promotion',
  robots: { index: false, follow: false },
}

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['admin', 'manager'])
  const { id } = await params
  const [promo, catalog] = await Promise.all([
    getPromotionById(id),
    listPromoPickerProducts(),
  ])
  if (!promo) notFound()

  return (
    <>
      <AdminPageHeader
        title={promo.title}
        backHref="/admin/promotions"
        backLabel="Back to promotions"
      />
      <PromoForm
        catalog={catalog}
        initial={{
          id: promo.id,
          title: promo.title,
          code: promo.code,
          description: promo.description,
          active: promo.active,
          starts_at: promo.starts_at ?? '',
          ends_at: promo.ends_at ?? '',
          never_expires: !promo.ends_at,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          product_ids: promo.product_ids,
        }}
      />
    </>
  )
}
