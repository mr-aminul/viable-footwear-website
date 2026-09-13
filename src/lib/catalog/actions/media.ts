'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { revalidateStorefront } from '@/lib/catalog/cache-tags'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  IMAGE_MAX_BYTES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_VIDEOS,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
  VIDEO_MAX_BYTES,
} from '@/lib/catalog/constants'
import { optimizeProductImage } from '@/lib/catalog/optimize-image'
import type { ActionResult } from '@/lib/catalog/types'
import { createClient } from '@/lib/supabase/server'

function revalidateProduct(productId: string, slug?: string) {
  revalidatePath(`/admin/catalog/products/${productId}`)
  revalidatePath('/admin/catalog')
  revalidateStorefront(slug)
  revalidateTag('admin-products')
  revalidateTag(`admin-product-${productId}`)
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  if (type === 'video/webm') return 'webm'
  if (type === 'video/mp4') return 'mp4'
  return 'jpg'
}

/**
 * Upload product image or video to Storage and insert media row.
 */
export async function uploadProductMedia(
  productId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose a file to upload.' }
  }

  const alt = String(formData.get('alt') ?? '').trim() || null
  const colorHexRaw = String(formData.get('color_hex') ?? '').trim()
  let colorHex: string | null = null
  if (colorHexRaw) {
    if (!/^#[0-9a-fA-F]{6}$/.test(colorHexRaw)) {
      return { ok: false, error: 'Color must be a #RRGGBB hex value.' }
    }
    colorHex = colorHexRaw.toUpperCase()
  }
  const isVideo = file.type.startsWith('video/')
  const mediaType = isVideo ? 'video' : 'image'

  if (isVideo) {
    if (!(ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, error: 'Video must be MP4 or WebM.' }
    }
    if (file.size > VIDEO_MAX_BYTES) {
      return { ok: false, error: 'Video must be 50MB or smaller.' }
    }
  } else {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, error: 'Image must be JPEG, PNG, WebP, or GIF.' }
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return { ok: false, error: 'Image must be 8MB or smaller.' }
    }
  }

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .maybeSingle()
  if (!product) return { ok: false, error: 'Product not found.' }

  const { data: existing } = await supabase
    .from('product_media')
    .select('id, media_type, sort_order')
    .eq('product_id', productId)

  const images = (existing ?? []).filter((m) => m.media_type === 'image')
  const videos = (existing ?? []).filter((m) => m.media_type === 'video')

  if (mediaType === 'image' && images.length >= MAX_PRODUCT_IMAGES) {
    return { ok: false, error: `At most ${MAX_PRODUCT_IMAGES} images per product.` }
  }
  if (mediaType === 'video' && videos.length >= MAX_PRODUCT_VIDEOS) {
    return { ok: false, error: 'Only one product video is allowed. Remove the existing one first.' }
  }

  const bucket = isVideo ? PRODUCT_VIDEO_BUCKET : PRODUCT_IMAGE_BUCKET
  const originalBytes = Buffer.from(await file.arrayBuffer())

  let uploadBody: Buffer = originalBytes
  let contentType = file.type
  let ext = extensionFor(file.type)

  if (!isVideo) {
    try {
      const optimized = await optimizeProductImage(originalBytes, file.type)
      if (optimized) {
        uploadBody = optimized.buffer
        contentType = optimized.contentType
        ext = optimized.extension
      }
    } catch {
      // Fall back to the original file if decode/encode fails.
    }
  }

  const storagePath = `${productId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, uploadBody, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    })

  if (uploadError) {
    return { ok: false, error: uploadError.message }
  }

  const nextSort =
    mediaType === 'image'
      ? images.reduce((max, m) => Math.max(max, m.sort_order), -1) + 1
      : 0

  const { data: row, error } = await supabase
    .from('product_media')
    .insert({
      product_id: productId,
      media_type: mediaType,
      storage_path: storagePath,
      alt,
      sort_order: nextSort,
      color_hex: mediaType === 'image' ? colorHex : null,
    })
    .select('id')
    .single()

  if (error) {
    await supabase.storage.from(bucket).remove([storagePath])
    return { ok: false, error: error.message }
  }

  revalidateProduct(productId, product.slug)
  return { ok: true, data: { id: row.id } }
}

/**
 * Delete media row and storage object.
 */
export async function deleteProductMedia(
  mediaId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { data: media, error: loadError } = await supabase
    .from('product_media')
    .select('id, product_id, media_type, storage_path')
    .eq('id', mediaId)
    .maybeSingle()

  if (loadError || !media) {
    return { ok: false, error: loadError?.message ?? 'Media not found.' }
  }

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', media.product_id)
    .maybeSingle()

  const { error } = await supabase
    .from('product_media')
    .delete()
    .eq('id', mediaId)

  if (error) return { ok: false, error: error.message }

  // Only remove Storage objects — leave local /public paths alone.
  if (
    !media.storage_path.startsWith('/') &&
    !media.storage_path.startsWith('http')
  ) {
    const bucket =
      media.media_type === 'video'
        ? PRODUCT_VIDEO_BUCKET
        : PRODUCT_IMAGE_BUCKET
    await supabase.storage.from(bucket).remove([media.storage_path])
  }

  revalidateProduct(media.product_id, product?.slug)
  return { ok: true }
}

/**
 * Persist image gallery order (IDs in desired order). First becomes primary.
 */
export async function reorderProductMedia(
  productId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .maybeSingle()

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from('product_media')
      .update({ sort_order: index })
      .eq('id', orderedIds[index])
      .eq('product_id', productId)
      .eq('media_type', 'image')
    if (error) return { ok: false, error: error.message }
  }

  revalidateProduct(productId, product?.slug)
  return { ok: true }
}

/**
 * Update alt text for a media row.
 */
export async function updateMediaAlt(
  mediaId: string,
  alt: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { data: media, error: loadError } = await supabase
    .from('product_media')
    .select('product_id')
    .eq('id', mediaId)
    .maybeSingle()

  if (loadError || !media) {
    return { ok: false, error: loadError?.message ?? 'Media not found.' }
  }

  const { error } = await supabase
    .from('product_media')
    .update({ alt: alt.trim() || null })
    .eq('id', mediaId)

  if (error) return { ok: false, error: error.message }

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', media.product_id)
    .maybeSingle()

  revalidateProduct(media.product_id, product?.slug)
  return { ok: true }
}

/**
 * Tag a gallery image with a colorway (null = shared across colors).
 */
export async function updateMediaColor(
  mediaId: string,
  colorHex: string | null,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const { data: media, error: loadError } = await supabase
    .from('product_media')
    .select('product_id, media_type')
    .eq('id', mediaId)
    .maybeSingle()

  if (loadError || !media) {
    return { ok: false, error: loadError?.message ?? 'Media not found.' }
  }
  if (media.media_type !== 'image') {
    return { ok: false, error: 'Only images can be tagged with a color.' }
  }

  let nextColor: string | null = null
  if (colorHex) {
    const trimmed = colorHex.trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return { ok: false, error: 'Color must be a #RRGGBB hex value.' }
    }
    nextColor = trimmed.toUpperCase()
  }

  const { error } = await supabase
    .from('product_media')
    .update({ color_hex: nextColor })
    .eq('id', mediaId)

  if (error) return { ok: false, error: error.message }

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', media.product_id)
    .maybeSingle()

  revalidateProduct(media.product_id, product?.slug)
  return { ok: true }
}

/**
 * Clear all gallery images tagged to a colorway (make them shared again).
 */
export async function clearColorwayMedia(
  productId: string,
  colorHex: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()

  const trimmed = colorHex.trim().toUpperCase()
  if (!/^#[0-9A-F]{6}$/.test(trimmed)) {
    return { ok: false, error: 'Color must be a #RRGGBB hex value.' }
  }

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .maybeSingle()
  if (!product) return { ok: false, error: 'Product not found.' }

  const { error } = await supabase
    .from('product_media')
    .update({ color_hex: null })
    .eq('product_id', productId)
    .eq('media_type', 'image')
    .eq('color_hex', trimmed)

  if (error) return { ok: false, error: error.message }

  revalidateProduct(productId, product.slug)
  return { ok: true }
}
