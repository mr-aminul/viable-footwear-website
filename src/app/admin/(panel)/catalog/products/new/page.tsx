import { ProductForm } from '@/components/admin/ProductForm'
import { AdminPageHeader } from '@/components/admin/ui'
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
        description="Create the core listing first. Variants and media come next."
      />
      <div className="mt-8">
        <ProductForm categories={categories} />
      </div>
    </>
  )
}
