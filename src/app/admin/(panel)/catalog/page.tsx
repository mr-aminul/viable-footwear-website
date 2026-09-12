import Link from 'next/link'
import { AdminProductsBrowser } from '@/components/admin/AdminProductsBrowser'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  AdminButton,
  AdminPageHeader,
  EmptyState,
  inputClassName,
} from '@/components/admin/ui'
import {
  getCategoryOptions,
  listAdminProductViews,
} from '@/lib/catalog/queries'

export const metadata = {
  title: 'Products',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 24

type Props = {
  searchParams: Promise<{
    q?: string
    category?: string
    status?: string
    page?: string
  }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const [categories, { products, total }] = await Promise.all([
    getCategoryOptions(),
    listAdminProductViews({
      q: params.q,
      category: params.category,
      status: params.status,
      page,
      pageSize: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filterParams = new URLSearchParams()
  if (params.q) filterParams.set('q', params.q)
  if (params.category) filterParams.set('category', params.category)
  if (params.status) filterParams.set('status', params.status)

  const hrefForPage = (target: number) => {
    const next = new URLSearchParams(filterParams)
    if (target > 1) next.set('page', String(target))
    const qs = next.toString()
    return qs ? `/admin/catalog?${qs}` : '/admin/catalog'
  }

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Manage catalog styles — switch layout anytime, click a product to edit."
        actions={
          <>
            <AdminButton href="/admin/catalog/products/new">
              New product
            </AdminButton>
            <AdminButton href="/admin/catalog/categories" variant="secondary">
              Categories
            </AdminButton>
          </>
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
            {categories.map((c) => (
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
            <option value="active">Published</option>
            <option value="inactive">Draft</option>
          </select>
        </label>
        <AdminActionButton type="submit" variant="secondary">
          Filter
        </AdminActionButton>
      </form>

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Create a category, then add your first product with sizes and photos."
            action={
              <AdminButton href="/admin/catalog/products/new">
                Create product
              </AdminButton>
            }
          />
        ) : (
          <>
            <AdminProductsBrowser products={products} total={total} />

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-between text-[13px] text-mute">
                <p>
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-3">
                  {page > 1 ? (
                    <Link
                      href={hrefForPage(page - 1)}
                      className="font-semibold text-navy hover:underline"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {page < totalPages ? (
                    <Link
                      href={hrefForPage(page + 1)}
                      className="font-semibold text-navy hover:underline"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
