import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import {
  AdminButton,
  AdminPageHeader,
  EmptyState,
  StatusPill,
  inputClassName,
} from '@/components/admin/ui'
import { formatPrice } from '@/lib/brand'
import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Products',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>
}

export default async function ProductsListPage({ searchParams }: Props) {
  await requireRole(['admin', 'manager'])
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, productsQuery] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true }),
    (async () => {
      let query = supabase
        .from('products')
        .select(
          'id, name, slug, price, active, featured, badge, category_id, updated_at',
        )
        .order('updated_at', { ascending: false })

      if (params.q) {
        const safe = params.q.replace(/[%_,.()]/g, '').trim()
        if (safe) {
          query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`)
        }
      }
      if (params.category) {
        query = query.eq('category_id', params.category)
      }
      if (params.status === 'active') query = query.eq('active', true)
      if (params.status === 'inactive') query = query.eq('active', false)

      return query
    })(),
  ])

  const { data: products } = productsQuery
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]))

  return (
    <AdminShell>
      <AdminPageHeader
        title="Products"
        description="Search, filter, and edit the live catalog."
        actions={
          <AdminButton href="/admin/catalog/products/new">
            New product
          </AdminButton>
        }
      />

      <form className="mt-6 flex flex-col gap-3 rounded-2xl border border-cloud bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Search
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Name or slug"
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Category
          </span>
          <select
            name="category"
            defaultValue={params.category ?? ''}
            className={`${inputClassName} mt-1`}
          >
            <option value="">All</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Status
          </span>
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className={`${inputClassName} mt-1`}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <AdminButton type="submit" variant="secondary">
          Filter
        </AdminButton>
      </form>

      <div className="mt-6">
        {(products ?? []).length === 0 ? (
          <EmptyState
            title="No products match"
            description="Try clearing filters, or create your first style."
            action={
              <AdminButton href="/admin/catalog/products/new">
                Create product
              </AdminButton>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(products ?? []).map((product) => (
                  <tr key={product.id} className="border-b border-cloud last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{product.name}</p>
                      <p className="text-[12px] text-mute">{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-mute">
                      {product.category_id
                        ? (categoryName.get(product.category_id) ?? '—')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {formatPrice(Number(product.price))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill active={product.active} />
                        {product.featured ? (
                          <span className="text-[11px] font-semibold text-navy">
                            Featured
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/catalog/products/${product.id}`}
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
