import { ProductForm } from '@/components/admin/ProductForm'
import { AdminButton, AdminPageHeader } from '@/components/admin/ui'
import { getCategoryOptions } from '@/lib/catalog/queries'

export const metadata = {
  title: 'New product',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  const categories = await getCategoryOptions()

  return (
    <>
      <AdminPageHeader
        title="New product"
        description="Create the core listing first (starts as draft). Add colors & sizes next, then flip Live."
        actions={
          <AdminButton href="/admin/catalog/products/bulk" variant="secondary">
            Bulk sheet
          </AdminButton>
        }
      />
      <div className="mt-8">
        <ProductForm categories={categories} />
      </div>
    </>
  )
}
