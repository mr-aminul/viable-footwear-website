import { CategoryForm } from '@/components/admin/CategoryForm'

export const metadata = {
  title: 'New category',
  robots: { index: false, follow: false },
}

export default async function NewCategoryPage() {
  return <CategoryForm />
}
