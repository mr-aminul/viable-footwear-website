import {
  AdminButton,
  AdminPageHeader,
  EmptyState,
} from '@/components/admin/ui'
import { CategoriesTable } from '@/components/admin/CategoriesTable'
import { createClient } from '@/lib/db/server'

export const metadata = {
  title: 'Categories',
  robots: { index: false, follow: false },
}

export default async function CategoriesListPage() {
  const db = await createClient()
  const { data: categories } = await db
    .from('categories')
    .select('id, name, slug, sort_order, active, updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <>
      <AdminPageHeader
        title="Categories"
        backHref="/admin/catalog"
        backLabel="Back to products"
        actions={
          <AdminButton href="/admin/catalog/categories/new">
            New category
          </AdminButton>
        }
      />

      <div className="mt-4">
        {(categories ?? []).length === 0 ? (
          <EmptyState
            title="No categories"
            description="Add your first category."
            action={
              <AdminButton href="/admin/catalog/categories/new">
                Create category
              </AdminButton>
            }
          />
        ) : (
          <CategoriesTable categories={categories ?? []} />
        )}
      </div>
    </>
  )
}
