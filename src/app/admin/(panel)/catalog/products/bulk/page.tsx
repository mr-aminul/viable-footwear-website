import { BulkProductsSheet } from '@/components/admin/BulkProductsSheet'
import { AdminPageHeader } from '@/components/admin/ui'
import { getCategoryOptions } from '@/lib/catalog/queries'

export const metadata = {
  title: 'Bulk add products',
  robots: { index: false, follow: false },
}

export default async function BulkProductsPage() {
  const categories = await getCategoryOptions()

  return (
    <>
      <AdminPageHeader
        title="Bulk add products"
        description="One row per product. List sizes and colors — we build every size × color variant for you."
        backHref="/admin/catalog"
        backLabel="Back to products"
      />
      <div className="mt-8">
        <BulkProductsSheet categories={categories} />
      </div>
    </>
  )
}
