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

/** One sheet row for bulk create (client-owned key for result mapping). */
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
  size_eu: number | null
  color: string
  color_hex: string
  stock: number | null
  sku: string
}

export type BulkProductRowResult = {
  key: string
  ok: boolean
  id?: string
  error?: string
}

/**
 * Create many products (+ one starter variant each) from a sheet payload.
 * Processes rows in order; empty name rows are skipped by the client.
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
    const sizeEu = row.size_eu ?? 40
    const stock = row.stock ?? 0
    const badge = normalizeProductBadge(row.badge)
    const colorHex = normalizeColorHex(row.color_hex) ?? '#1A3668'
    const color = row.color?.trim() || null
    const sku = row.sku?.trim() || null
    const description = row.description?.trim() ?? ''
    const categoryId = row.category_id?.trim() || null
    const featured = Boolean(row.featured)

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
    if (!Number.isFinite(sizeEu) || sizeEu <= 0) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Size EU must be a valid number.',
      })
      continue
    }
    if (!Number.isFinite(stock) || stock < 0) {
      results.push({
        key: row.key,
        ok: false,
        error: 'Stock must be zero or greater.',
      })
      continue
    }

    seenSlugs.add(slug)

    const { data: product, error: productError } = await supabase
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
        featured,
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
      .insert({
        product_id: product.id,
        size_eu: sizeEu,
        color,
        color_hex: colorHex,
        sku,
        stock,
        active: true,
      })

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
    results.push({ key: row.key, ok: true, id: product.id })
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
