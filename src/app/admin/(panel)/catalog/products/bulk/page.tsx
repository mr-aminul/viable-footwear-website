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
        backHref="/admin/catalog"
        backLabel="Back to products"
      />
      <div className="mt-4">
        <BulkProductsSheet categories={categories} />
      </div>
    </>
  )
}
