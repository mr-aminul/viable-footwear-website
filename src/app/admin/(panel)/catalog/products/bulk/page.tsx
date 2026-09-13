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
        description="Fill the sheet like Google Sheets — one product per row. Paste from Excel works too."
        backHref="/admin/catalog"
        backLabel="Back to products"
      />
      <div className="mt-8">
        <BulkProductsSheet categories={categories} />
      </div>
    </>
  )
}
