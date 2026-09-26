import Link from 'next/link'
import { InventoryTable } from '@/components/admin/InventoryTable'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  AdminPageHeader,
  inputClassName,
} from '@/components/admin/ui'
import {
  getAdminInventorySummary,
  listAdminInventory,
  type AdminInventoryStockFilter,
} from '@/lib/catalog/queries'

export const metadata = {
  title: 'Inventory',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 50
const LOW_STOCK_THRESHOLD = 5
const STOCK_FILTERS = new Set<AdminInventoryStockFilter>([
  'all',
  'in',
  'low',
  'out',
])

type Props = {
  searchParams: Promise<{
    q?: string
    stock?: string
    status?: string
    page?: string
  }>
}

function parseStockFilter(value?: string): AdminInventoryStockFilter {
  if (value && STOCK_FILTERS.has(value as AdminInventoryStockFilter)) {
    return value as AdminInventoryStockFilter
  }
  return 'all'
}

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const stock = parseStockFilter(params.stock)
  const productStatus = params.status

  const [summary, { rows, total }] = await Promise.all([
    getAdminInventorySummary({
      q: params.q,
      productStatus,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    }),
    listAdminInventory({
      q: params.q,
      stock,
      productStatus,
      page,
      pageSize: PAGE_SIZE,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filterParams = new URLSearchParams()
  if (params.q) filterParams.set('q', params.q)
  if (stock !== 'all') filterParams.set('stock', stock)
  if (productStatus) filterParams.set('status', productStatus)

  const hrefForPage = (target: number) => {
    const next = new URLSearchParams(filterParams)
    if (target > 1) next.set('page', String(target))
    const qs = next.toString()
    return qs ? `/admin/inventory?${qs}` : '/admin/inventory'
  }

  const hrefForStock = (nextStock: AdminInventoryStockFilter) => {
    const next = new URLSearchParams()
    if (params.q) next.set('q', params.q)
    if (nextStock !== 'all') next.set('stock', nextStock)
    if (productStatus) next.set('status', productStatus)
    const qs = next.toString()
    return qs ? `/admin/inventory?${qs}` : '/admin/inventory'
  }

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description="All size × color stock in one place. Adjust quantities here — changes save immediately."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Variants"
          value={summary.totalVariants}
          href={hrefForStock('all')}
          active={stock === 'all'}
        />
        <SummaryCard
          label="In stock"
          value={summary.inStock}
          href={hrefForStock('in')}
          active={stock === 'in'}
          tone="ok"
        />
        <SummaryCard
          label={`Low (≤${LOW_STOCK_THRESHOLD})`}
          value={summary.lowStock}
          href={hrefForStock('low')}
          active={stock === 'low'}
          tone="low"
        />
        <SummaryCard
          label="Out of stock"
          value={summary.outOfStock}
          href={hrefForStock('out')}
          active={stock === 'out'}
          tone="out"
        />
      </div>

      <form className="mt-6 flex flex-col gap-3 rounded-2xl border border-cloud bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Search
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Product name, slug, or SKU"
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Stock
          </span>
          <select
            name="stock"
            defaultValue={stock}
            className={`${inputClassName} mt-1`}
          >
            <option value="all">All levels</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Product
          </span>
          <select
            name="status"
            defaultValue={productStatus ?? ''}
            className={`${inputClassName} mt-1`}
          >
            <option value="">All</option>
            <option value="active">Live</option>
            <option value="inactive">Draft</option>
          </select>
        </label>
        <AdminActionButton type="submit" variant="secondary">
          Filter
        </AdminActionButton>
      </form>

      <div className="mt-8">
        <InventoryTable rows={rows} />

        {totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-between text-[13px] text-mute">
            <p>
              Page {page} of {totalPages}
              <span className="ml-2">({total} variants)</span>
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
        ) : total > 0 ? (
          <p className="mt-4 text-[13px] text-mute">{total} variants</p>
        ) : null}
      </div>
    </>
  )
}

function SummaryCard({
  label,
  value,
  href,
  active,
  tone,
}: {
  label: string
  value: number
  href: string
  active?: boolean
  tone?: 'ok' | 'low' | 'out'
}) {
  const valueClass =
    tone === 'out'
      ? 'text-spark'
      : tone === 'low'
        ? 'text-amber-800'
        : tone === 'ok'
          ? 'text-emerald-800'
          : 'text-ink'

  return (
    <Link
      href={href}
      className={[
        'rounded-2xl border bg-white px-4 py-4 transition',
        active
          ? 'border-navy/40 ring-1 ring-navy/20'
          : 'border-cloud hover:border-navy/25',
      ].join(' ')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </Link>
  )
}
