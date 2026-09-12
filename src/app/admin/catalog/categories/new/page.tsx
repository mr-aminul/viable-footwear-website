import { AdminShell } from '@/components/admin/AdminShell'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { AdminPageHeader } from '@/components/admin/ui'
import { requireRole } from '@/lib/auth/session'

export const metadata = {
  title: 'New category',
  robots: { index: false, follow: false },
}

export default async function NewCategoryPage() {
  await requireRole(['admin', 'manager'])

  return (
    <AdminShell>
      <AdminPageHeader
        title="New category"
        description="Slug becomes the shop filter key."
      />
      <div className="mt-8">
        <CategoryForm />
      </div>
    </AdminShell>
  )
}
