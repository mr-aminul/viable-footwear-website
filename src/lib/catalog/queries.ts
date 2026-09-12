import type { Database } from '@/lib/supabase/database.types'
import type { ProductBadge } from '@/lib/catalog/constants'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import { resolveMediaUrl } from '@/lib/catalog/media-url'
import type {
  CategoryView,
  Product,
  ProductVariantView,
} from '@/lib/catalog/types'
import { createClient } from '@/lib/supabase/server'

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type MediaRow = Database['public']['Tables']['product_media']['Row']
type VariantRow = Database['public']['Tables']['product_variants']['Row']

function parseBadge(value: string | null): ProductBadge | undefined {
  if (value === 'New' || value === 'Sale' || value === 'Bestseller') return value
  return undefined
}

function mapVariants(rows: VariantRow[]): ProductVariantView[] {
  return rows
    .filter((v) => v.active)
    .sort((a, b) => a.size_eu - b.size_eu)
    .map((v) => ({
      id: v.id,
      sizeEu: Number(v.size_eu),
      color: v.color,
      colorHex: v.color_hex,
      stock: v.stock,
      sku: v.sku,
    }))
}

function mapProduct(
  row: ProductRow,
  category: CategoryRow | null | undefined,
  media: MediaRow[],
  variants: VariantRow[],
): Product {
  const images = media
    .filter((m) => m.media_type === 'image')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => resolveMediaUrl(m.storage_path, 'image'))

  const video = media.find((m) => m.media_type === 'video')
  const variantViews = mapVariants(variants)
  const sizes = [...new Set(variantViews.map((v) => v.sizeEu))].sort(
    (a, b) => a - b,
  )
  const colors = [
    ...new Set(
      variantViews
        .map((v) => v.colorHex || v.color)
        .filter((c): c is string => Boolean(c)),
    ),
  ]

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: category?.slug ?? 'uncategorized',
    categoryLabel: category?.name ?? 'Footwear',
    price: Number(row.price),
    compareAt: row.compare_at != null ? Number(row.compare_at) : undefined,
    rating: Number(row.rating),
    reviews: row.reviews_count,
    image: images[0] ?? '/images/products/product-foam-cream.png',
    images,
    videoUrl: video
      ? resolveMediaUrl(video.storage_path, 'video')
      : undefined,
    colors,
    sizes,
    variants: variantViews,
    badge: parseBadge(row.badge),
    description: row.description,
    featured: row.featured,
    weightKg: Number(row.weight_kg),
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
  }
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * Active categories with product counts for storefront filters.
 */
export async function listStoreCategories(): Promise<CategoryView[]> {
  if (!supabaseConfigured()) return []

  const supabase = await createClient()
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('products').select('id, category_id').eq('active', true),
  ])

  const counts = new Map<string, number>()
  for (const p of products ?? []) {
    if (!p.category_id) continue
    counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1)
  }

  return (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: resolveMediaUrl(c.image_path),
    count: counts.get(c.id) ?? 0,
    seoTitle: c.seo_title ?? undefined,
    seoDescription: c.seo_description ?? undefined,
  }))
}

type ProductBundle = {
  product: ProductRow
  category: CategoryRow | null
  media: MediaRow[]
  variants: VariantRow[]
}

async function loadProductBundles(
  productRows: ProductRow[],
): Promise<Product[]> {
  if (productRows.length === 0) return []

  const supabase = await createClient()
  const ids = productRows.map((p) => p.id)
  const categoryIds = [
    ...new Set(
      productRows
        .map((p) => p.category_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const [{ data: media }, { data: variants }, { data: categories }] =
    await Promise.all([
      supabase
        .from('product_media')
        .select('*')
        .in('product_id', ids)
        .order('sort_order', { ascending: true }),
      supabase.from('product_variants').select('*').in('product_id', ids),
      categoryIds.length
        ? supabase.from('categories').select('*').in('id', categoryIds)
        : Promise.resolve({ data: [] as CategoryRow[] }),
    ])

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]))
  const mediaByProduct = new Map<string, MediaRow[]>()
  for (const row of media ?? []) {
    const list = mediaByProduct.get(row.product_id) ?? []
    list.push(row)
    mediaByProduct.set(row.product_id, list)
  }
  const variantsByProduct = new Map<string, VariantRow[]>()
  for (const row of variants ?? []) {
    const list = variantsByProduct.get(row.product_id) ?? []
    list.push(row)
    variantsByProduct.set(row.product_id, list)
  }

  return productRows.map((product) =>
    mapProduct(
      product,
      product.category_id
        ? (categoryById.get(product.category_id) ?? null)
        : null,
      mediaByProduct.get(product.id) ?? [],
      variantsByProduct.get(product.id) ?? [],
    ),
  )
}

/**
 * Active products for shop / home (optionally filtered by category slug).
 */
export async function listStoreProducts(options?: {
  categorySlug?: string
  featuredOnly?: boolean
  limit?: number
}): Promise<Product[]> {
  if (!supabaseConfigured()) return []

  const supabase = await createClient()
  let categoryId: string | undefined

  if (options?.categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', options.categorySlug)
      .eq('active', true)
      .maybeSingle()
    if (!category) return []
    categoryId = category.id
  }

  let query = supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (categoryId) query = query.eq('category_id', categoryId)
  if (options?.featuredOnly) query = query.eq('featured', true)
  if (options?.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error || !data) return []
  return loadProductBundles(data)
}

/**
 * Load one active product by slug, or null.
 */
export async function getStoreProductBySlug(
  slug: string,
): Promise<Product | null> {
  if (!supabaseConfigured()) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return null
  const [product] = await loadProductBundles([data])
  return product ?? null
}

/**
 * Related products: manual list first, else same category.
 */
export async function getRelatedProducts(
  product: Product,
  relatedIds: string[],
): Promise<Product[]> {
  if (!supabaseConfigured()) return []

  const supabase = await createClient()
  const orderedIds = relatedIds.filter((id) => id !== product.id)

  if (orderedIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .in('id', orderedIds)
      .eq('active', true)

    const byId = new Map((data ?? []).map((row) => [row.id, row]))
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((row): row is ProductRow => Boolean(row))
      .slice(0, RELATED_PRODUCTS_DISPLAY_CAP)

    return loadProductBundles(ordered)
  }

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', product.category)
    .maybeSingle()

  if (!category) return []

  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('category_id', category.id)
    .neq('id', product.id)
    .order('featured', { ascending: false })
    .limit(RELATED_PRODUCTS_DISPLAY_CAP)

  return loadProductBundles(data ?? [])
}

/**
 * Raw related IDs for a product (admin + PDP resolver).
 */
export async function getRelatedProductIds(
  productId: string,
): Promise<string[]> {
  if (!supabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('related_product_ids')
    .eq('id', productId)
    .maybeSingle()
  return data?.related_product_ids ?? []
}

/**
 * All active product slugs for sitemap.
 */
export async function listActiveProductSlugs(): Promise<
  { slug: string; updatedAt: string }[]
> {
  if (!supabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('active', true)
  return (data ?? []).map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at,
  }))
}

export type { ProductBundle }
