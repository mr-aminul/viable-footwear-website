import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'
import { toProxiedMediaUrl } from '@/lib/media/storage-proxy'

/** Shown when a product/category has no media. */
export const MEDIA_FALLBACK = '/favicon.png'

/**
 * Resolve a storage path or absolute/public path to a browser URL.
 * Storage objects are served via `/api/media/…` so Vercel CDN caches them.
 */
export function resolveMediaUrl(
  path: string | null | undefined,
  mediaType: 'image' | 'video' = 'image',
): string {
  const bucket =
    mediaType === 'video' ? PRODUCT_VIDEO_BUCKET : PRODUCT_IMAGE_BUCKET
  return toProxiedMediaUrl(path, bucket, MEDIA_FALLBACK)
}
