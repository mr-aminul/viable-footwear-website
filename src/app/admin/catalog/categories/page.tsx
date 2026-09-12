import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import {
  AdminButton,
  AdminPageHeader,
  EmptyState,
  StatusPill,
} from '@/components/admin/ui'
import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Categories',
  robots: { index: false, follow: false },
}

export default async function CategoriesListPage() {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order, active, updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <AdminShell>
      <AdminPageHeader
        title="Categories"
        description="Organize the shop. Soft-deactivate instead of deleting."
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
          <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(categories ?? []).map((category) => (
                  <tr key={category.id} className="border-b border-cloud last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-mute">{category.slug}</td>
                    <td className="px-4 py-3 text-mute">{category.sort_order}</td>
                    <td className="px-4 py-3">
                      <StatusPill active={category.active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/catalog/categories/${category.id}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
