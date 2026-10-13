import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'
import { toProxiedMediaUrl } from '@/lib/media/storage-proxy'

/**
 * Resolve a storage path or absolute/public path to a browser URL.
 * Storage objects go directly to Supabase public URLs (no Vercel proxy).
 */
export function resolveMediaUrl(
  path: string | null | undefined,
  mediaType: 'image' | 'video' = 'image',
): string {
  const bucket =
    mediaType === 'video' ? PRODUCT_VIDEO_BUCKET : PRODUCT_IMAGE_BUCKET
  return toProxiedMediaUrl(
    path,
    bucket,
    '/images/products/product-foam-cream.png',
  )
}
