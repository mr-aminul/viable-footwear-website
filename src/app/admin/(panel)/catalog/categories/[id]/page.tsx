import { notFound } from 'next/navigation'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Edit category',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!category) notFound()

  return (
    <CategoryForm
      initial={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        active: category.active,
        seo_title: category.seo_title ?? '',
        seo_description: category.seo_description ?? '',
      }}
    />
  )
}
