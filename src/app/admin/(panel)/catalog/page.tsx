import Link from 'next/link'
import { AdminProductsBrowser } from '@/components/admin/AdminProductsBrowser'
import {
  AdminButton,
  AdminPageHeader,
  EmptyState,
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
        actions={
          <>
            <AdminButton href="/admin/catalog/products/new" prefetch={false}>
              New product
            </AdminButton>
            <AdminButton
              href="/admin/catalog/products/bulk"
              variant="secondary"
            >
              Bulk sheet
            </AdminButton>
            <AdminButton href="/admin/catalog/categories" variant="secondary">
              Categories
            </AdminButton>
          </>
        }
      />

      <form
        method="get"
        className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1"
      >
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Name or slug"
          aria-label="Search"
          className="h-8 w-44 shrink-0 rounded-lg border border-cloud bg-white px-2.5 text-[12px] text-ink outline-none transition placeholder:text-mute focus:border-navy"
        />
        <select
          name="category"
          defaultValue={params.category ?? ''}
          aria-label="Category"
          className="h-8 shrink-0 rounded-lg border border-cloud bg-white px-2.5 text-[12px] text-ink outline-none transition focus:border-navy"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ''}
          aria-label="Status"
          className="h-8 shrink-0 rounded-lg border border-cloud bg-white px-2.5 text-[12px] text-ink outline-none transition focus:border-navy"
        >
          <option value="">Status</option>
          <option value="active">Published</option>
          <option value="inactive">Draft</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-navy px-3 text-[12px] font-semibold text-white transition hover:bg-navy-deep"
        >
          Apply
        </button>
      </form>

      <div className="mt-4">
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add a product or use the bulk sheet."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AdminButton href="/admin/catalog/products/new" prefetch={false}>
                  Create product
                </AdminButton>
                <AdminButton
                  href="/admin/catalog/products/bulk"
                  variant="secondary"
                >
                  Bulk sheet
                </AdminButton>
              </div>
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
