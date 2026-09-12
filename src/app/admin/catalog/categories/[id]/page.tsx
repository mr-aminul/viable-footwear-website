import { notFound } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { AdminPageHeader } from '@/components/admin/ui'
import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Edit category',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditCategoryPage({ params }: Props) {
  await requireRole(['admin', 'manager'])
  const { id } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!category) notFound()

  return (
    <AdminShell>
      <AdminPageHeader
        title={category.name}
        description={`Slug: ${category.slug}`}
      />
      <div className="mt-8">
        <CategoryForm
          initial={{
            id: category.id,
            name: category.name,
            slug: category.slug,
            sort_order: category.sort_order,
            active: category.active,
            seo_title: category.seo_title ?? '',
            seo_description: category.seo_description ?? '',
          }}
        />
      </div>
    </AdminShell>
  )
}
