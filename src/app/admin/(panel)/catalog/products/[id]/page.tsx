import { redirect, notFound } from 'next/navigation'
import { adminProductPath } from '@/lib/admin/paths'
import { getAdminProductView } from '@/lib/catalog/queries'

export const metadata = {
  title: 'Edit product',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

/**
 * Legacy UUID editor URL → /product/[slug]/admin
 */
export default async function LegacyEditProductRedirect({ params }: Props) {
  const { id } = await params
  const product = await getAdminProductView(id)
  if (!product) notFound()
  redirect(adminProductPath(product.slug))
}
