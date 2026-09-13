import {
  AdminButton,
  AdminPageHeader,
  EmptyState,
} from '@/components/admin/ui'
import { CategoriesTable } from '@/components/admin/CategoriesTable'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Categories',
  robots: { index: false, follow: false },
}

export default async function CategoriesListPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order, active, updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Organize the shop. Drag rows to set storefront order. Deactivate categories you are not using instead of deleting them."
        backHref="/admin/catalog"
        backLabel="Back to products"
        actions={
          <AdminButton href="/admin/catalog/categories/new">
            New category
          </AdminButton>
        }
      />

      <div className="mt-8">
        {(categories ?? []).length === 0 ? (
          <EmptyState
            title="No categories"
            description="Create Crocs, Slides, Sneakers, and the rest of your range."
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
