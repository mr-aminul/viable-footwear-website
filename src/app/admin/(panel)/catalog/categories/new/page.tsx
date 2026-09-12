import { CategoryForm } from '@/components/admin/CategoryForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'New category',
  robots: { index: false, follow: false },
}

export default async function NewCategoryPage() {

  return (
    <>
      <AdminPageHeader
        title="New category"
        description="Slug becomes the shop filter key."
      />
      <div className="mt-8">
        <CategoryForm />
      </div>
    </>
  )
}
