'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { revalidateStorefront } from '@/lib/catalog/cache-tags'
import { normalizeProductBadge } from '@/lib/catalog/badge'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import { normalizeColorHex } from '@/lib/catalog/gallery'
import { isValidSlug, slugify } from '@/lib/catalog/slug'
import type { ActionResult, RelatedProductOption } from '@/lib/catalog/types'
import { createClient } from '@/lib/supabase/server'

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function readNumber(formData: FormData, key: string): number | null {
  const raw = readString(formData, key)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function revalidateProductSurfaces(...slugs: Array<string | null | undefined>) {
  revalidatePath('/admin/catalog')
  revalidatePath('/admin/catalog/products')
  revalidateStorefront(...slugs)
  revalidateTag('admin-products')
}

type VariantInput = {
  id?: string
  size_eu: number
  color?: string | null
  color_hex?: string | null
  sku?: string | null
  stock: number
  active: boolean
}

function parseVariantsJson(raw: string): VariantInput[] | { error: string } {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return { error: 'Variants payload must be an array.' }

    const variants: VariantInput[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const size = Number(row.size_eu)
      const stock = Number(row.stock ?? 0)
      if (!Number.isFinite(size) || size <= 0) {
        return { error: 'Each variant needs a valid EU size.' }
      }
      if (!Number.isFinite(stock) || stock < 0) {
        return { error: 'Stock must be zero or greater.' }
      }
      variants.push({
        id: typeof row.id === 'string' ? row.id : undefined,
        size_eu: size,
        color: typeof row.color === 'string' ? row.color : null,
        color_hex:
          typeof row.color_hex === 'string'
            ? normalizeColorHex(row.color_hex)
            : null,
        sku: typeof row.sku === 'string' ? row.sku : null,
        stock,
        active: row.active !== false,
      })
    }
    return variants
  } catch {
    return { error: 'Could not parse variants.' }
  }
}

async function countActiveVariants(
  productId: string,
): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('product_variants')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('active', true)
  return count ?? 0
}

/** One sheet row = one product. Variants expand from sizes × colors lists. */
export type BulkProductRowInput = {
  key: string
  name: string
  slug: string
  description: string
  price: number | null
  compare_at: number | null
  weight_kg: number | null
  category_id: string | null
  badge: string
  featured: boolean
  /** Comma/space separated EU sizes, e.g. "40, 41, 42". */
  sizes: string
  /** Comma separated colors, e.g. "Black, White" or "Black:#111111". */
  colors: string
  /** Starting stock applied to every generated variant. */
  stock: number | null
}

export type BulkProductRowResult = {
  key: string
  ok: boolean
  id?: string
  error?: string
  /** How many variants were created for this product. */
  variantCount?: number
}

const MAX_VARIANTS_PER_PRODUCT = 80

const NAMED_COLOR_HEX: Record<string, string> = {
  black: '#111111',
  white: '#F5F5F5',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  navy: '#1A3668',
  blue: '#2563EB',
  red: '#DC2626',
  green: '#16A34A',
  brown: '#8B5E3C',
  tan: '#D2B48C',
  beige: '#E8DCC8',
  grey: '#6B7280',
  gray: '#6B7280',
  charcoal: '#374151',
  pink: '#DB2777',
  purple: '#7C3AED',
  yellow: '#EAB308',
  orange: '#EA580C',
  olive: '#6B8E23',
  maroon: '#7F1D1D',
  gold: '#C9A227',
  silver: '#C0C0C0',
}

function splitList(raw: string): string[] {
  return raw
    .split(/[,|/;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseSizesList(raw: string): number[] | { error: string } {
  const parts = splitList(raw)
  if (parts.length === 0) return [40]

  const sizes: number[] = []
  for (const part of parts) {
    const value = Number(part)
    if (!Number.isFinite(value) || value <= 0) {
      return { error: `Invalid size "${part}". Use numbers like 40, 41, 42.` }
    }
    if (!sizes.includes(value)) sizes.push(value)
  }
  return sizes.sort((a, b) => a - b)
}

function parseColorToken(raw: string): { color: string; color_hex: string } {
  const match = raw.match(/^(.+?)[#:=]\s*(#?[0-9a-fA-F]{6})$/)
  if (match) {
    const color = match[1]!.trim()
    const hex = normalizeColorHex(match[2]) ?? '#1A3668'
    return { color, color_hex: hex }
  }

  const color = raw.trim()
  const named = NAMED_COLOR_HEX[color.toLowerCase()]
  return { color, color_hex: named ?? '#1A3668' }
}

function parseColorsList(
  raw: string,
): Array<{ color: string | null; color_hex: string }> | { error: string } {
  const parts = splitList(raw)
  if (parts.length === 0) {
    return [{ color: null, color_hex: '#1A3668' }]
  }

  const colors: Array<{ color: string | null; color_hex: string }> = []
  const seen = new Set<string>()
  for (const part of parts) {
    const parsed = parseColorToken(part)
    const key = `${(parsed.color || '').toLowerCase()}|${parsed.color_hex}`
    if (seen.has(key)) continue
    seen.add(key)
    colors.push(parsed)
  }
  return colors
}

function expandVariants(input: {
  sizes: string
  colors: string
  stock: number | null
}):
  | {
      variants: Array<{
        size_eu: number
        color: string | null
        color_hex: string
        stock: number
        sku: string | null
      }>
    }
  | { error: string } {
  const sizes = parseSizesList(input.sizes)
  if ('error' in sizes) return sizes
  const colors = parseColorsList(input.colors)
  if ('error' in colors) return colors

  const stock = input.stock ?? 0
  if (!Number.isFinite(stock) || stock < 0) {
    return { error: 'Stock must be zero or greater.' }
  }

  const total = sizes.length * colors.length
  if (total > MAX_VARIANTS_PER_PRODUCT) {
    return {
      error: `That makes ${total} variants (max ${MAX_VARIANTS_PER_PRODUCT}). Use fewer sizes or colors.`,
    }
  }

  const variants = []
  for (const size of sizes) {
    for (const color of colors) {
      variants.push({
        size_eu: size,
        color: color.color,
        color_hex: color.color_hex,
        stock,
        sku: null,
      })
    }
  }
  return { variants }
}

/**
 * Create many products from a sheet.
 * One row = one product. Sizes × colors expand into variants automatically.
 */
export async function bulkCreateProducts(
  rows: BulkProductRowInput[],
): Promise<ActionResult<{ created: number; results: BulkProductRowResult[] }>> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'Add at least one product row.' }
  }
  if (rows.length > 500) {
    return { ok: false, error: 'Bulk create is limited to 500 rows at a time.' }
  }

  const results: BulkProductRowResult[] = []
  const seenSlugs = new Set<string>()
  const createdSlugs: string[] = []
  let created = 0

  for (const row of rows) {
    const name = row.name?.trim() ?? ''
    if (!name) {
      results.push({ key: row.key, ok: false, error: 'Name is required.' })
      continue
    }

    const slug = (row.slug?.trim() || slugify(name)).toLowerCase()
    const price = row.price
    const compareAt = row.compare_at
    const weightKg = row.weight_kg ?? 0.5

    if (!isValidSlug(slug)) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Slug must be lowercase letters, numbers, and hyphens.',
      })
      continue
    }
    if (seenSlugs.has(slug)) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Duplicate slug in this sheet.',
      })
      continue
    }
    if (price == null || !Number.isFinite(price) || price < 0) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Price must be zero or greater.',
      })
      continue
    }
    if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < 0)) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Compare-at must be zero or greater.',
      })
      continue
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Weight must be greater than zero.',
      })
      continue
    }

    const expanded = expandVariants({
      sizes: row.sizes ?? '',
      colors: row.colors ?? '',
      stock: row.stock,
    })
    if ('error' in expanded) {
      results.push({ key: row.key, ok: false, error: expanded.error })
      continue
    }

    seenSlugs.add(slug)

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        description: row.description?.trim() ?? '',
        price,
        compare_at: compareAt,
        weight_kg: weightKg,
        category_id: row.category_id?.trim() || null,
        badge: normalizeProductBadge(row.badge),
        featured: Boolean(row.featured),
        active: true,
      })
      .select('id')
      .single()

    if (productError || !product) {
      seenSlugs.delete(slug)
      results.push({
        key: row.key,
        ok: false,
        error:
          productError?.code === '23505'
            ? 'That slug is already in use.'
            : (productError?.message ?? 'Could not create product.'),
      })
      continue
    }

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(
        expanded.variants.map((variant) => ({
          product_id: product.id,
          size_eu: variant.size_eu,
          color: variant.color,
          color_hex: variant.color_hex,
          sku: variant.sku,
          stock: variant.stock,
          active: true,
        })),
      )

    if (variantError) {
      await supabase.from('products').delete().eq('id', product.id)
      seenSlugs.delete(slug)
      results.push({
        key: row.key,
        ok: false,
        error:
          variantError.code === '23505'
            ? 'Duplicate size/color combination.'
            : variantError.message,
      })
      continue
    }

    created += 1
    createdSlugs.push(slug)
    results.push({
      key: row.key,
      ok: true,
      id: product.id,
      variantCount: expanded.variants.length,
    })
  }

  if (created > 0) {
    revalidateProductSurfaces(...createdSlugs)
  }

  return { ok: true, data: { created, results } }
}

/**
 * Create product core fields, then edit page for variants/media.
 */
export async function createProduct(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const name = readString(formData, 'name')
  const slug = readString(formData, 'slug') || slugify(name)
  const description = readString(formData, 'description')
  const price = readNumber(formData, 'price')
  const compareAt = readNumber(formData, 'compare_at')
  const weightKg = readNumber(formData, 'weight_kg') ?? 0.5
  const categoryId = readString(formData, 'category_id') || null
  const badge = normalizeProductBadge(readString(formData, 'badge'))
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const featured =
    formData.get('featured') === 'on' || formData.get('featured') === 'true'
  // Products are published by default.
  const active = true

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens.' }
  }
  if (price == null || price < 0) {
    return { ok: false, error: 'Price must be zero or greater.' }
  }
  if (compareAt != null && compareAt < 0) {
    return { ok: false, error: 'Compare-at price must be zero or greater.' }
  }
  if (weightKg <= 0) {
    return { ok: false, error: 'Weight must be greater than zero.' }
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      slug,
      description,
      price,
      compare_at: compareAt,
      weight_kg: weightKg,
      category_id: categoryId,
      badge,
      seo_title: seoTitle,
      seo_description: seoDescription,
      featured,
      active,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That slug is already in use.' }
    }
    return { ok: false, error: error.message }
  }

  revalidateProductSurfaces(slug)
  return { ok: true, data: { id: data.id } }
}

/**
 * Update core product fields. Activating requires ≥1 active variant.
 */
export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const name = readString(formData, 'name')
  const slug = readString(formData, 'slug')
  const description = readString(formData, 'description')
  const price = readNumber(formData, 'price')
  const compareAt = readNumber(formData, 'compare_at')
  const weightKg = readNumber(formData, 'weight_kg') ?? 0.5
  const categoryId = readString(formData, 'category_id') || null
  const badge = normalizeProductBadge(readString(formData, 'badge'))
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const featured =
    formData.get('featured') === 'on' || formData.get('featured') === 'true'
  const active =
    formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens.' }
  }
  if (price == null || price < 0) {
    return { ok: false, error: 'Price must be zero or greater.' }
  }
  if (compareAt != null && compareAt < 0) {
    return { ok: false, error: 'Compare-at price must be zero or greater.' }
  }
  if (weightKg <= 0) {
    return { ok: false, error: 'Weight must be greater than zero.' }
  }

  if (active) {
    const activeVariants = await countActiveVariants(productId)
    if (activeVariants < 1) {
      return {
        ok: false,
        error: 'Add at least one active size/color variant before publishing.',
      }
    }
  }

  const { data: existing } = await supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .maybeSingle()

  const { error } = await supabase
    .from('products')
    .update({
      name,
      slug,
      description,
      price,
      compare_at: compareAt,
      weight_kg: weightKg,
      category_id: categoryId,
      badge,
      seo_title: seoTitle,
      seo_description: seoDescription,
      featured,
      active,
    })
    .eq('id', productId)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That slug is already in use.' }
    }
    return { ok: false, error: error.message }
  }

  revalidateProductSurfaces(slug, existing?.slug)
  revalidatePath(`/admin/catalog/products/${productId}`)
  return { ok: true }
}

/**
 * Soft-deactivate product (preferred over hard delete).
 */
export async function deactivateProduct(
  productId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', productId)
    .select('slug')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidateProductSurfaces(data.slug)
  return { ok: true }
}

/**
 * Replace all variants for a product from JSON payload.
 */
export async function saveProductVariants(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const parsed = parseVariantsJson(readString(formData, 'variants_json'))
  if ('error' in parsed) return { ok: false, error: parsed.error }

  const { data: product } = await supabase
    .from('products')
    .select('slug, active')
    .eq('id', productId)
    .maybeSingle()

  if (!product) return { ok: false, error: 'Product not found.' }

  const { data: existing } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)

  const keepIds = new Set(
    parsed.map((v) => v.id).filter((id): id is string => Boolean(id)),
  )
  const toDelete = (existing ?? [])
    .map((v) => v.id)
    .filter((id) => !keepIds.has(id))

  if (toDelete.length > 0) {
    // Soft-deactivate removed variants so historical orders stay coherent.
    const { error: deactivateError } = await supabase
      .from('product_variants')
      .update({ active: false })
      .in('id', toDelete)
    if (deactivateError) {
      return { ok: false, error: deactivateError.message }
    }
  }

  const toUpdate = parsed.filter((v) => v.id)
  const toInsert = parsed.filter((v) => !v.id)

  if (toUpdate.length > 0) {
    const updateResults = await Promise.all(
      toUpdate.map((variant) =>
        supabase
          .from('product_variants')
          .update({
            size_eu: variant.size_eu,
            color: variant.color,
            color_hex: variant.color_hex,
            sku: variant.sku,
            stock: variant.stock,
            active: variant.active,
          })
          .eq('id', variant.id!)
          .eq('product_id', productId),
      ),
    )
    for (const { error } of updateResults) {
      if (!error) continue
      if (error.code === '23505') {
        return { ok: false, error: 'Duplicate size/color combination.' }
      }
      return { ok: false, error: error.message }
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('product_variants').insert(
      toInsert.map((variant) => ({
        product_id: productId,
        size_eu: variant.size_eu,
        color: variant.color,
        color_hex: variant.color_hex,
        sku: variant.sku,
        stock: variant.stock,
        active: variant.active,
      })),
    )
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Duplicate size/color combination.' }
      }
      return { ok: false, error: error.message }
    }
  }

  const activeCount = parsed.filter((v) => v.active).length
  if (product.active && activeCount < 1) {
    await supabase
      .from('products')
      .update({ active: false })
      .eq('id', productId)
  }

  revalidateProductSurfaces(product.slug)
  revalidatePath(`/admin/catalog/products/${productId}`)
  return { ok: true }
}

/**
 * Lightweight product search for You May Also Like picker.
 * Empty query returns [] — client should not call until the user types.
 */
export async function searchRelatedProductOptions(
  productId: string,
  query: string,
): Promise<RelatedProductOption[]> {
  const safe = query.replace(/[%_,.()]/g, '').trim()
  if (!safe) return []

  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('id, name, slug, active')
    .neq('id', productId)
    .or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`)
    .order('name', { ascending: true })
    .limit(8)

  return data ?? []
}

/**
 * Persist ordered related product IDs (excludes self, capped).
 */
export async function saveRelatedProducts(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  let ids: string[] = []
  try {
    const raw = JSON.parse(readString(formData, 'related_ids_json') || '[]') as unknown
    if (!Array.isArray(raw)) {
      return { ok: false, error: 'Related products payload must be an array.' }
    }
    ids = raw
      .filter((id): id is string => typeof id === 'string')
      .filter((id) => id !== productId)
      .slice(0, RELATED_PRODUCTS_DISPLAY_CAP)
  } catch {
    return { ok: false, error: 'Could not parse related products.' }
  }

  const { data: product, error } = await supabase
    .from('products')
    .update({ related_product_ids: ids })
    .eq('id', productId)
    .select('slug')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidateProductSurfaces(product.slug)
  revalidatePath(`/admin/catalog/products/${productId}`)
  return { ok: true }
}
