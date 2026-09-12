import { AdminShell } from '@/components/admin/AdminShell'
import { ProductForm } from '@/components/admin/ProductForm'
import { AdminPageHeader } from '@/components/admin/ui'
import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'New product',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('sort_order', { ascending: true })

  return (
    <AdminShell>
      <AdminPageHeader
        title="New product"
        description="Create the core listing first. Variants and media come next."
      />
      <div className="mt-8">
        <ProductForm categories={categories ?? []} />
      </div>
    </AdminShell>
  )
}
