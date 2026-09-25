import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import type { Database } from '@/lib/supabase/database.types'
import {
  STORE_CACHE_REVALIDATE_SECONDS,
  STORE_CATALOG_TAG,
  storeProductTag,
} from '@/lib/catalog/cache-tags'
import type { ProductBadge } from '@/lib/catalog/constants'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import { resolveMediaUrl } from '@/lib/catalog/media-url'
import { normalizeColorHex } from '@/lib/catalog/gallery'
import type {
  CategoryView,
  Product,
  ProductVariantView,
  RelatedProductOption,
} from '@/lib/catalog/types'
import { createServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type MediaRow = Database['public']['Tables']['product_media']['Row']
type VariantRow = Database['public']['Tables']['product_variants']['Row']

function parseBadge(value: string | null): ProductBadge {
  if (value === 'New' || value === 'Sale' || value === 'Bestseller') return value
  return 'New'
}

function mapVariants(
  rows: VariantRow[],
  mediaById: Map<string, string>,
  activeOnly = true,
): ProductVariantView[] {
  return rows
    .filter((v) => (activeOnly ? v.active : true))
    .sort((a, b) => a.size_eu - b.size_eu)
    .map((v) => ({
      id: v.id,
      sizeEu: Number(v.size_eu),
      color: v.color,
      colorHex: normalizeColorHex(v.color_hex) ?? v.color_hex,
      imageUrl: v.media_id ? (mediaById.get(v.media_id) ?? null) : null,
      stock: v.stock,
      sku: v.sku,
    }))
}

function mapProduct(
  row: ProductRow,
  category: CategoryRow | null | undefined,
  media: MediaRow[],
  variants: VariantRow[],
  options?: { includeInactiveVariants?: boolean },
): Product {
  const imageRows = media
    .filter((m) => m.media_type === 'image')
    .sort((a, b) => a.sort_order - b.sort_order)
  const images = imageRows.map((m) => ({
    url: resolveMediaUrl(m.storage_path, 'image'),
    colorHex: normalizeColorHex(m.color_hex),
  }))
  const mediaById = new Map(
    imageRows.map((m) => [m.id, resolveMediaUrl(m.storage_path, 'image')]),
  )

  const video = media.find((m) => m.media_type === 'video')
  const variantViews = mapVariants(
    variants,
    mediaById,
    !options?.includeInactiveVariants,
  )
  const sizes = [...new Set(variantViews.map((v) => v.sizeEu))].sort(
    (a, b) => a - b,
  )
  const colors = [
    ...new Set(
      variantViews
        .map((v) => v.color?.trim())
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
    image: images[0]?.url ?? '/images/products/product-foam-cream.png',
    images,
    videoUrl: video
      ? resolveMediaUrl(video.storage_path, 'video')
      : undefined,
    colors,
    sizes,
    variants: variantViews,
    badge: parseBadge(row.badge),
    description: row.description,
    subtitle: row.subtitle?.trim() || undefined,
    fitNote: row.fit_note?.trim() || undefined,
    materials: row.materials?.trim() || undefined,
    careInfo: row.care_info?.trim() || undefined,
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
 * Cached on Vercel Data Cache; purged on catalog writes via `store-catalog`.
 */
export async function listStoreCategories(): Promise<CategoryView[]> {
  if (!supabaseConfigured()) return []

  return unstable_cache(
    async (): Promise<CategoryView[]> => {
      const supabase = createServiceClient()
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
    },
    ['store-categories'],
    {
      revalidate: STORE_CACHE_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_TAG],
    },
  )()
}

type BundleClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createServiceClient>

async function loadProductBundles(
  productRows: ProductRow[],
  options?: {
    client?: BundleClient
    includeInactiveVariants?: boolean
  },
): Promise<Product[]> {
  if (productRows.length === 0) return []

  const supabase = options?.client ?? (await createClient())
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
      { includeInactiveVariants: options?.includeInactiveVariants },
    ),
  )
}

/** Storefront-shaped product plus admin publish flags for WYSIWYG CMS. */
export type AdminProductView = Product & {
  active: boolean
  categoryId: string | null
  relatedProductIds: string[]
}

/**
 * Active products for shop / home (optionally filtered by category slug).
 * Cached on Vercel Data Cache; purged on catalog writes via `store-catalog`.
 */
export async function listStoreProducts(options?: {
  categorySlug?: string
  featuredOnly?: boolean
  limit?: number
}): Promise<Product[]> {
  if (!supabaseConfigured()) return []

  const categorySlug = options?.categorySlug ?? ''
  const featuredOnly = Boolean(options?.featuredOnly)
  const limit = options?.limit

  return unstable_cache(
    async (): Promise<Product[]> => {
      const supabase = createServiceClient()
      let categoryId: string | undefined

      if (categorySlug) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
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
      if (featuredOnly) query = query.eq('featured', true)
      if (limit != null) query = query.limit(limit)

      const { data, error } = await query
      if (error || !data) return []
      return loadProductBundles(data, { client: supabase })
    },
    [
      'store-products',
      categorySlug,
      featuredOnly ? '1' : '0',
      limit != null ? String(limit) : '',
    ],
    {
      revalidate: STORE_CACHE_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_TAG],
    },
  )()
}

/**
 * Load one active product by slug, or null.
 * Request-deduped (metadata + page) and Data-Cache tagged per slug.
 */
export const getStoreProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    if (!supabaseConfigured()) return null

    return unstable_cache(
      async (): Promise<Product | null> => {
        const supabase = createServiceClient()
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .eq('active', true)
          .maybeSingle()

        if (error || !data) return null
        const [product] = await loadProductBundles([data], { client: supabase })
        return product ?? null
      },
      ['store-product', slug],
      {
        revalidate: STORE_CACHE_REVALIDATE_SECONDS,
        tags: [STORE_CATALOG_TAG, storeProductTag(slug)],
      },
    )()
  },
)

/**
 * Related products: manual list first, else same category.
 */
export async function getRelatedProducts(
  product: Product,
  relatedIds: string[],
): Promise<Product[]> {
  if (!supabaseConfigured()) return []

  const orderedIds = relatedIds.filter((id) => id !== product.id)
  const idsKey = orderedIds.join(',')

  return unstable_cache(
    async (): Promise<Product[]> => {
      const supabase = createServiceClient()

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

        return loadProductBundles(ordered, { client: supabase })
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

      return loadProductBundles(data ?? [], { client: supabase })
    },
    ['store-related', product.id, idsKey, product.category],
    {
      revalidate: STORE_CACHE_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_TAG, storeProductTag(product.slug)],
    },
  )()
}

/**
 * Raw related IDs for a product (admin + PDP resolver).
 */
export const getRelatedProductIds = cache(
  async (productId: string): Promise<string[]> => {
    if (!supabaseConfigured()) return []

    return unstable_cache(
      async (): Promise<string[]> => {
        const supabase = createServiceClient()
        const { data } = await supabase
          .from('products')
          .select('related_product_ids')
          .eq('id', productId)
          .maybeSingle()
        return data?.related_product_ids ?? []
      },
      ['store-related-ids', productId],
      {
        revalidate: STORE_CACHE_REVALIDATE_SECONDS,
        tags: [STORE_CATALOG_TAG],
      },
    )()
  },
)

/**
 * All active product slugs for sitemap.
 */
export async function listActiveProductSlugs(): Promise<
  { slug: string; updatedAt: string }[]
> {
  if (!supabaseConfigured()) return []

  return unstable_cache(
    async () => {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('products')
        .select('slug, updated_at')
        .eq('active', true)
      return (data ?? []).map((row) => ({
        slug: row.slug,
        updatedAt: row.updated_at,
      }))
    },
    ['store-product-slugs'],
    {
      revalidate: STORE_CACHE_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_TAG],
    },
  )()
}

/* ── Admin helpers (cached reads via service role) ─────────────────────── */

export type CategoryOption = { id: string; name: string }

/**
 * Cached category dropdown options (shared across product forms / filters).
 */
export function getCategoryOptions() {
  return unstable_cache(
    async (): Promise<CategoryOption[]> => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('categories')
        .select('id, name')
        .order('sort_order', { ascending: true })
      return data ?? []
    },
    ['admin-category-options'],
    { revalidate: 60, tags: ['admin-categories'] },
  )()
}

/**
 * Resolve related-product rows by id, preserving input order.
 */
export function getRelatedProductOptionsByIdsCached(ids: string[]) {
  if (ids.length === 0) {
    return Promise.resolve([] as RelatedProductOption[])
  }

  const sortedKey = [...ids].sort().join(',')
  return unstable_cache(
    async (): Promise<RelatedProductOption[]> => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('products')
        .select('id, name, slug, active')
        .in('id', ids)

      const byId = new Map((data ?? []).map((row) => [row.id, row]))
      return ids
        .map((id) => byId.get(id))
        .filter((row): row is RelatedProductOption => Boolean(row))
    },
    [`related-options-${sortedKey}`],
    { revalidate: 30, tags: ['admin-products'] },
  )()
}

/** Compact card row for the admin You May Also Like picker. */
export type RelatedPickerProduct = {
  id: string
  name: string
  price: number
  compareAt?: number
  image: string
  badge: ProductBadge
  active: boolean
  categoryId: string | null
  categoryLabel: string
  categorySort: number
}

/**
 * All other products as mini cards for related-product selection (cached ~30s).
 */
export function listRelatedPickerProducts(excludeProductId: string) {
  return unstable_cache(
    async (): Promise<RelatedPickerProduct[]> => {
      const admin = createServiceClient()
      const [{ data: products }, { data: categories }, { data: media }] =
        await Promise.all([
          admin
            .from('products')
            .select('id, name, price, compare_at, badge, active, category_id')
            .neq('id', excludeProductId)
            .order('name', { ascending: true }),
          admin
            .from('categories')
            .select('id, name, sort_order')
            .order('sort_order', { ascending: true }),
          admin
            .from('product_media')
            .select('product_id, storage_path, sort_order')
            .eq('media_type', 'image')
            .order('sort_order', { ascending: true }),
        ])

      const categoryById = new Map(
        (categories ?? []).map((c) => [
          c.id,
          { name: c.name, sort: c.sort_order },
        ]),
      )

      const primaryImageByProduct = new Map<string, string>()
      for (const row of media ?? []) {
        if (primaryImageByProduct.has(row.product_id)) continue
        primaryImageByProduct.set(
          row.product_id,
          resolveMediaUrl(row.storage_path, 'image'),
        )
      }

      return (products ?? []).map((row) => {
        const category = row.category_id
          ? categoryById.get(row.category_id)
          : undefined
        return {
          id: row.id,
          name: row.name,
          price: Number(row.price),
          compareAt:
            row.compare_at != null ? Number(row.compare_at) : undefined,
          image:
            primaryImageByProduct.get(row.id) ??
            '/images/products/product-foam-cream.png',
          badge: parseBadge(row.badge),
          active: row.active,
          categoryId: row.category_id,
          categoryLabel: category?.name ?? 'Uncategorized',
          categorySort: category?.sort ?? 9999,
        }
      })
    },
    [`related-picker-${excludeProductId}`],
    { revalidate: 30, tags: ['admin-products'] },
  )()
}

/**
 * Full catalog for promo product multi-select (same shape as related picker).
 */
export function listPromoPickerProducts() {
  return unstable_cache(
    async (): Promise<RelatedPickerProduct[]> => {
      const admin = createServiceClient()
      const [{ data: products }, { data: categories }, { data: media }] =
        await Promise.all([
          admin
            .from('products')
            .select('id, name, price, compare_at, badge, active, category_id')
            .order('name', { ascending: true }),
          admin
            .from('categories')
            .select('id, name, sort_order')
            .order('sort_order', { ascending: true }),
          admin
            .from('product_media')
            .select('product_id, storage_path, sort_order')
            .eq('media_type', 'image')
            .order('sort_order', { ascending: true }),
        ])

      const categoryById = new Map(
        (categories ?? []).map((c) => [
          c.id,
          { name: c.name, sort: c.sort_order },
        ]),
      )

      const primaryImageByProduct = new Map<string, string>()
      for (const row of media ?? []) {
        if (primaryImageByProduct.has(row.product_id)) continue
        primaryImageByProduct.set(
          row.product_id,
          resolveMediaUrl(row.storage_path, 'image'),
        )
      }

      return (products ?? []).map((row) => {
        const category = row.category_id
          ? categoryById.get(row.category_id)
          : undefined
        return {
          id: row.id,
          name: row.name,
          price: Number(row.price),
          compareAt:
            row.compare_at != null ? Number(row.compare_at) : undefined,
          image:
            primaryImageByProduct.get(row.id) ??
            '/images/products/product-foam-cream.png',
          badge: parseBadge(row.badge),
          active: row.active,
          categoryId: row.category_id,
          categoryLabel: category?.name ?? 'Uncategorized',
          categorySort: category?.sort ?? 9999,
        }
      })
    },
    ['promo-picker-products'],
    { revalidate: 30, tags: ['admin-products'] },
  )()
}

/**
 * Catalog home KPI counts (cached ~30s).
 */
export function getCatalogCounts() {
  return unstable_cache(
    async () => {
      const admin = createServiceClient()
      const [{ data: products }, { count: categoryCount }] = await Promise.all([
        admin.from('products').select('id, active'),
        admin.from('categories').select('id', { count: 'exact', head: true }),
      ])
      const list = products ?? []
      return {
        productCount: list.length,
        activeProductCount: list.filter((p) => p.active).length,
        categoryCount: categoryCount ?? 0,
      }
    },
    ['admin-catalog-counts'],
    { revalidate: 30, tags: ['admin-products', 'admin-categories'] },
  )()
}

const ADMIN_PRODUCT_DETAIL_SELECT =
  'id, name, slug, description, subtitle, fit_note, materials, care_info, price, compare_at, weight_kg, category_id, badge, featured, active, seo_title, seo_description, related_product_ids' as const

/**
 * Cached product core row for the admin edit page.
 */
export function getAdminProductById(id: string) {
  return unstable_cache(
    async () => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('products')
        .select(ADMIN_PRODUCT_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle()
      return data
    },
    [`admin-product-${id}`],
    { revalidate: 15, tags: ['admin-products', `admin-product-${id}`] },
  )()
}

export function getAdminProductVariants(productId: string) {
  return unstable_cache(
    async () => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('product_variants')
        .select('id, size_eu, color, color_hex, sku, stock, active, media_id')
        .eq('product_id', productId)
        .order('size_eu', { ascending: true })
      return data ?? []
    },
    [`admin-product-variants-${productId}`],
    { revalidate: 15, tags: ['admin-products', `admin-product-${productId}`] },
  )()
}

export function getAdminProductMedia(productId: string) {
  return unstable_cache(
    async () => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('product_media')
        .select('id, media_type, storage_path, alt, sort_order, color_hex')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true })
      return data ?? []
    },
    [`admin-product-media-${productId}`],
    { revalidate: 15, tags: ['admin-products', `admin-product-${productId}`] },
  )()
}

export type AdminProductListFilters = {
  q?: string
  category?: string
  status?: string
  page: number
  pageSize: number
}

export type AdminProductListRow = {
  id: string
  name: string
  slug: string
  price: number
  active: boolean
  featured: boolean
  badge: string | null
  category_id: string | null
  updated_at: string
}

/**
 * Paginated admin products list (cached ~15s per filter set).
 */
export function listAdminProducts(filters: AdminProductListFilters) {
  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1
  const cacheKey = [
    'admin-products-list',
    filters.q ?? '',
    filters.category ?? '',
    filters.status ?? '',
    String(filters.page),
    String(filters.pageSize),
  ]

  return unstable_cache(
    async (): Promise<{ products: AdminProductListRow[]; total: number }> => {
      const admin = createServiceClient()
      let query = admin
        .from('products')
        .select(
          'id, name, slug, price, active, featured, badge, category_id, updated_at',
          { count: 'exact' },
        )
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (filters.q) {
        const safe = filters.q.replace(/[%_,.()]/g, '').trim()
        if (safe) {
          query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`)
        }
      }
      if (filters.category) {
        query = query.eq('category_id', filters.category)
      }
      if (filters.status === 'active') query = query.eq('active', true)
      if (filters.status === 'inactive') query = query.eq('active', false)

      const { data, count } = await query
      return {
        products: (data ?? []).map((row) => ({
          ...row,
          price: Number(row.price),
        })),
        total: count ?? 0,
      }
    },
    cacheKey,
    { revalidate: 15, tags: ['admin-products'] },
  )()
}

/**
 * Storefront-shaped product cards for the admin Products grid (includes drafts).
 */
export function listAdminProductViews(filters: AdminProductListFilters) {
  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1
  const cacheKey = [
    'admin-product-views',
    filters.q ?? '',
    filters.category ?? '',
    filters.status ?? '',
    String(filters.page),
    String(filters.pageSize),
  ]

  return unstable_cache(
    async (): Promise<{ products: AdminProductView[]; total: number }> => {
      const admin = createServiceClient()
      let query = admin
        .from('products')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (filters.q) {
        const safe = filters.q.replace(/[%_,.()]/g, '').trim()
        if (safe) {
          query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`)
        }
      }
      if (filters.category) {
        query = query.eq('category_id', filters.category)
      }
      if (filters.status === 'active') query = query.eq('active', true)
      if (filters.status === 'inactive') query = query.eq('active', false)

      const { data, count } = await query
      const rows = data ?? []
      const views = await loadProductBundles(rows, {
        client: admin,
        includeInactiveVariants: true,
      })
      const byId = new Map(rows.map((row) => [row.id, row]))

      return {
        products: views.map((product) => {
          const row = byId.get(product.id)!
          return {
            ...product,
            active: row.active,
            categoryId: row.category_id,
            relatedProductIds: row.related_product_ids ?? [],
          }
        }),
        total: count ?? 0,
      }
    },
    cacheKey,
    { revalidate: 15, tags: ['admin-products'] },
  )()
}

/**
 * One product in storefront shape for the admin visual editor (any status).
 */
export function getAdminProductView(id: string) {
  return unstable_cache(
    async (): Promise<AdminProductView | null> => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!data) return null

      const [product] = await loadProductBundles([data], {
        client: admin,
        includeInactiveVariants: true,
      })
      if (!product) return null

      return {
        ...product,
        active: data.active,
        categoryId: data.category_id,
        relatedProductIds: data.related_product_ids ?? [],
      }
    },
    [`admin-product-view-${id}`],
    { revalidate: 15, tags: ['admin-products', `admin-product-${id}`] },
  )()
}

/**
 * Same as getAdminProductView, keyed by storefront slug.
 */
export function getAdminProductViewBySlug(slug: string) {
  return unstable_cache(
    async (): Promise<AdminProductView | null> => {
      const admin = createServiceClient()
      const { data } = await admin
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (!data) return null

      const [product] = await loadProductBundles([data], {
        client: admin,
        includeInactiveVariants: true,
      })
      if (!product) return null

      return {
        ...product,
        active: data.active,
        categoryId: data.category_id,
        relatedProductIds: data.related_product_ids ?? [],
      }
    },
    [`admin-product-view-slug-${slug}`],
    { revalidate: 15, tags: ['admin-products', `admin-product-slug-${slug}`] },
  )()
}

