import { redirect } from 'next/navigation'
import { AdminButton, AdminPageHeader } from '@/components/admin/ui'
import { adminProductPath } from '@/lib/admin/paths'
import { createDraftProduct } from '@/lib/catalog/actions/products'

export const metadata = {
  title: 'New product',
  robots: { index: false, follow: false },
}

/**
 * Creates a blank draft and opens the visual PDP editor immediately.
 */
export default async function NewProductPage() {
  const result = await createDraftProduct()

  if (result.ok) {
    redirect(`${adminProductPath(result.data.slug)}?fresh=1`)
  }

  return (
    <>
      <AdminPageHeader
        title="New product"
        description="Couldn’t start a draft. Try again, or go back to the catalog."
      />
      <div className="mt-8 space-y-4">
        <p className="text-[14px] text-red-700">{result.error}</p>
        <div className="flex flex-wrap gap-2">
          <AdminButton href="/admin/catalog/products/new">Try again</AdminButton>
          <AdminButton href="/admin/catalog" variant="secondary">
            Back to products
          </AdminButton>
        </div>
      </div>
    </>
  )
}
