import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'

/**
 * Resolve a storage path or absolute/public path to a browser URL.
 */
export function resolveMediaUrl(
  path: string | null | undefined,
  mediaType: 'image' | 'video' = 'image',
): string {
  if (!path) return '/images/products/product-foam-cream.png'
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return path

  const bucket =
    mediaType === 'video' ? PRODUCT_VIDEO_BUCKET : PRODUCT_IMAGE_BUCKET
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}
