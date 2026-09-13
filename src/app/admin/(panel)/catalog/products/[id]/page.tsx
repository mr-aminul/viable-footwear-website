import { notFound } from 'next/navigation'
import { AdminProductEditor } from '@/components/admin/AdminProductEditor'
import {
  getAdminProductMedia,
  getAdminProductVariants,
  getAdminProductView,
  getCategoryOptions,
  listRelatedPickerProducts,
} from '@/lib/catalog/queries'

export const metadata = {
  title: 'Edit product',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

/**
 * Visual PDP editor — same layout as the storefront product page.
 */
export default async function EditProductPage({ params }: Props) {
  const { id } = await params

  const [product, categories, media, variants, relatedCatalog] =
    await Promise.all([
      getAdminProductView(id),
      getCategoryOptions(),
      getAdminProductMedia(id),
      getAdminProductVariants(id),
      listRelatedPickerProducts(id),
    ])

  if (!product) notFound()

  return (
    <AdminProductEditor
      product={product}
      categories={categories}
      media={media.map((m) => ({
        id: m.id,
        media_type: m.media_type,
        storage_path: m.storage_path,
        alt: m.alt,
        sort_order: m.sort_order,
        color_hex: m.color_hex,
      }))}
      initialVariants={variants.map((v) => ({
        key: v.id,
        id: v.id,
        size_eu: String(v.size_eu),
        color: v.color ?? '',
        color_hex: v.color_hex ?? '',
        sku: v.sku ?? '',
        stock: String(v.stock),
        active: v.active,
      }))}
      relatedCatalog={relatedCatalog}
      initialRelatedIds={product.relatedProductIds}
    />
  )
}
