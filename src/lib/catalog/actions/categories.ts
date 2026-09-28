'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { revalidateStorefront } from '@/lib/catalog/cache-tags'
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_BUCKET,
} from '@/lib/catalog/constants'
import { optimizeProductImage } from '@/lib/catalog/optimize-image'
import { isValidSlug, slugify } from '@/lib/catalog/slug'
import type { ActionResult } from '@/lib/catalog/types'
import { createClient } from '@/lib/supabase/server'

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  return 'jpg'
}

function isStorageObjectPath(path: string | null | undefined): boolean {
  if (!path) return false
  return (
    !path.startsWith('http://') &&
    !path.startsWith('https://') &&
    !path.startsWith('/')
  )
}

async function removeCategoryImageObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined,
) {
  if (!isStorageObjectPath(path) || !path?.startsWith('categories/')) return
  await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path])
}

function revalidateCatalog() {
  revalidatePath('/admin/catalog')
  revalidatePath('/admin/catalog/categories')
  revalidateStorefront()
  revalidateTag('admin-categories')
}

/**
 * Create a category. Soft-active by default.
 */
export async function createCategory(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const name = readString(formData, 'name')
  const slugInput = readString(formData, 'slug')
  const slug = slugInput || slugify(name)
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const imagePath = readString(formData, 'image_path') || null
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens.' }
  }

  const { data: last } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSort = (last?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      image_path: imagePath,
      seo_title: seoTitle,
      seo_description: seoDescription,
      sort_order: nextSort,
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

  revalidateCatalog()
  return { ok: true, data: { id: data.id } }
}

/**
 * Update an existing category.
 */
export async function updateCategory(
  categoryId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const name = readString(formData, 'name')
  const slug = readString(formData, 'slug')
  const seoTitle = readString(formData, 'seo_title') || null
  const seoDescription = readString(formData, 'seo_description') || null
  const imagePath = readString(formData, 'image_path') || null
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens.' }
  }

  const { data: existing } = await supabase
    .from('categories')
    .select('image_path')
    .eq('id', categoryId)
    .maybeSingle()

  const { error } = await supabase
    .from('categories')
    .update({
      name,
      slug,
      image_path: imagePath,
      seo_title: seoTitle,
      seo_description: seoDescription,
      active,
    })
    .eq('id', categoryId)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That slug is already in use.' }
    }
    return { ok: false, error: error.message }
  }

  if (existing?.image_path && existing.image_path !== imagePath) {
    await removeCategoryImageObject(supabase, existing.image_path)
  }

  revalidateCatalog()
  revalidatePath(`/admin/catalog/categories/${categoryId}`)
  return { ok: true }
}

/**
 * Upload a square tile image for a category. Returns a storage path to save on
 * the category row (does not write the row itself).
 */
export async function uploadCategoryImage(
  categoryId: string | null,
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose a file to upload.' }
  }

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: 'Image must be JPEG, PNG, WebP, or GIF.' }
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: 'Image must be 20MB or smaller.' }
  }

  if (categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle()
    if (!category) return { ok: false, error: 'Category not found.' }
  }

  const originalBytes = Buffer.from(await file.arrayBuffer())
  let uploadBody: Buffer = originalBytes
  let contentType = file.type
  let ext = extensionFor(file.type)

  try {
    const optimized = await optimizeProductImage(originalBytes, file.type, {
      square: true,
    })
    if (optimized) {
      uploadBody = optimized.buffer
      contentType = optimized.contentType
      ext = optimized.extension
    } else if (
      file.type === 'image/gif' &&
      originalBytes.byteLength > 2 * 1024 * 1024
    ) {
      return {
        ok: false,
        error:
          'Animated GIFs over 2MB are not allowed. Convert to a still image.',
      }
    }
  } catch {
    // Keep original if optimize fails.
  }

  const folder = categoryId ?? '_new'
  const storagePath = `categories/${folder}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(storagePath, uploadBody, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    })

  if (uploadError) {
    return { ok: false, error: uploadError.message || 'Upload failed.' }
  }

  return { ok: true, data: { path: storagePath } }
}

/**
 * Persist category list order (IDs in desired order).
 */
export async function reorderCategories(
  orderedIds: string[],
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from('categories')
      .update({ sort_order: index })
      .eq('id', orderedIds[index])
    if (error) return { ok: false, error: error.message }
  }

  revalidateCatalog()
  return { ok: true }
}

/**
 * Soft-deactivate a category (never hard-delete).
 */
export async function deactivateCategory(
  categoryId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ active: false })
    .eq('id', categoryId)

  if (error) return { ok: false, error: error.message }

  revalidateCatalog()
  return { ok: true }
}

/**
 * Re-activate a category.
 */
export async function activateCategory(
  categoryId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ active: true })
    .eq('id', categoryId)

  if (error) return { ok: false, error: error.message }

  revalidateCatalog()
  return { ok: true }
}
