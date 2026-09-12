'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import { isValidSlug, slugify } from '@/lib/catalog/slug'
import type { ActionResult } from '@/lib/catalog/types'
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

function revalidateProductSurfaces(slug?: string) {
  revalidatePath('/admin/catalog')
  revalidatePath('/admin/catalog/products')
  revalidatePath('/shop')
  revalidatePath('/')
  if (slug) revalidatePath(`/product/${slug}`)
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
        color_hex: typeof row.color_hex === 'string' ? row.color_hex : null,
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
  const badge = readString(formData, 'badge') || null
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const featured =
    formData.get('featured') === 'on' || formData.get('featured') === 'true'
  // New products start inactive until variants exist — quality gate.
  const active = false

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
  const badge = readString(formData, 'badge') || null
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

  revalidateProductSurfaces(slug)
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

  for (const variant of parsed) {
    if (variant.id) {
      const { error } = await supabase
        .from('product_variants')
        .update({
          size_eu: variant.size_eu,
          color: variant.color,
          color_hex: variant.color_hex,
          sku: variant.sku,
          stock: variant.stock,
          active: variant.active,
        })
        .eq('id', variant.id)
        .eq('product_id', productId)
      if (error) {
        if (error.code === '23505') {
          return { ok: false, error: 'Duplicate size/color combination.' }
        }
        return { ok: false, error: error.message }
      }
    } else {
      const { error } = await supabase.from('product_variants').insert({
        product_id: productId,
        size_eu: variant.size_eu,
        color: variant.color,
        color_hex: variant.color_hex,
        sku: variant.sku,
        stock: variant.stock,
        active: variant.active,
      })
      if (error) {
        if (error.code === '23505') {
          return { ok: false, error: 'Duplicate size/color combination.' }
        }
        return { ok: false, error: error.message }
      }
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
