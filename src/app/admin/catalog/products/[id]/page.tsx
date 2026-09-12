import { notFound } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { ProductForm } from '@/components/admin/ProductForm'
import { ProductMediaManager } from '@/components/admin/ProductMediaManager'
import { RelatedProductsPicker } from '@/components/admin/RelatedProductsPicker'
import { VariantsEditor } from '@/components/admin/VariantsEditor'
import { AdminPageHeader, StatusPill } from '@/components/admin/ui'
import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Edit product',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  await requireRole(['admin', 'manager'])
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: product },
    { data: categories },
    { data: variants },
    { data: media },
    { data: allProducts },
  ] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('size_eu', { ascending: true }),
    supabase
      .from('product_media')
      .select('*')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, slug, active')
      .neq('id', id)
      .order('name', { ascending: true }),
  ])

  if (!product) notFound()

  return (
    <AdminShell>
      <AdminPageHeader
        title={product.name}
        description={
          <span className="inline-flex items-center gap-2">
            <span>/{product.slug}</span>
            <StatusPill active={product.active} />
          </span>
        }
      />

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="text-[15px] font-semibold text-ink">Details</h2>
          <div className="mt-4">
            <ProductForm
              categories={categories ?? []}
              initial={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: Number(product.price),
                compare_at:
                  product.compare_at != null
                    ? Number(product.compare_at)
                    : null,
                weight_kg: Number(product.weight_kg),
                category_id: product.category_id,
                badge: product.badge,
                featured: product.featured,
                active: product.active,
                seo_title: product.seo_title ?? '',
                seo_description: product.seo_description ?? '',
              }}
            />
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-ink">Variants</h2>
          <p className="mt-1 text-[13px] text-mute">
            Size, color, and stock. Required before publishing.
          </p>
          <div className="mt-4">
            <VariantsEditor
              productId={product.id}
              initial={(variants ?? []).map((v) => ({
                key: v.id,
                id: v.id,
                size_eu: String(v.size_eu),
                color: v.color ?? '',
                color_hex: v.color_hex ?? '',
                sku: v.sku ?? '',
                stock: String(v.stock),
                active: v.active,
              }))}
            />
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-ink">Media</h2>
          <p className="mt-1 text-[13px] text-mute">
            First image is the primary shop/PDP image.
          </p>
          <div className="mt-4">
            <ProductMediaManager
              productId={product.id}
              initial={(media ?? []).map((m) => ({
                id: m.id,
                media_type: m.media_type,
                storage_path: m.storage_path,
                alt: m.alt,
                sort_order: m.sort_order,
              }))}
            />
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-ink">
            You May Also Like
          </h2>
          <div className="mt-4">
            <RelatedProductsPicker
              productId={product.id}
              initialIds={product.related_product_ids ?? []}
              options={allProducts ?? []}
            />
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
