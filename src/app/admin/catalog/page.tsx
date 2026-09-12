import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { AdminButton, AdminPageHeader, EmptyState } from '@/components/admin/ui'
import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Catalog',
  robots: { index: false, follow: false },
}

export default async function CatalogHomePage() {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const [
    { count: productCount },
    { count: activeProductCount },
    { count: categoryCount },
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('active', true),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ])

  return (
    <AdminShell>
      <AdminPageHeader
        title="Catalog"
        description="Manage categories, products, media, and You May Also Like."
        actions={
          <>
            <AdminButton href="/admin/catalog/products/new">New product</AdminButton>
            <AdminButton href="/admin/catalog/categories/new" variant="secondary">
              New category
            </AdminButton>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Products" value={String(productCount ?? 0)} />
        <StatCard label="Published" value={String(activeProductCount ?? 0)} />
        <StatCard label="Categories" value={String(categoryCount ?? 0)} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/catalog/products"
          className="rounded-2xl border border-cloud bg-white p-6 transition hover:border-navy/30"
        >
          <h2 className="text-[16px] font-semibold text-ink">Products</h2>
          <p className="mt-2 text-[14px] text-mute">
            Prices, variants, media, SEO, and related products.
          </p>
        </Link>
        <Link
          href="/admin/catalog/categories"
          className="rounded-2xl border border-cloud bg-white p-6 transition hover:border-navy/30"
        >
          <h2 className="text-[16px] font-semibold text-ink">Categories</h2>
          <p className="mt-2 text-[14px] text-mute">
            Shop filters, sort order, and category SEO.
          </p>
        </Link>
      </div>

      {(productCount ?? 0) === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No products yet"
            description="Create a category, then add your first product with sizes and photos."
            action={<AdminButton href="/admin/catalog/products/new">Create product</AdminButton>}
          />
        </div>
      ) : null}
    </AdminShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cloud bg-white p-5 shadow-card">
      <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
    </div>
  )
}
