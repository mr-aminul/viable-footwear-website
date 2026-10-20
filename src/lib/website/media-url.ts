import { SITE_MEDIA_BUCKET } from '@/lib/website/constants'
import { toProxiedMediaUrl } from '@/lib/media/storage-proxy'

/**
 * Resolve a site media path (public `/…`, absolute URL, or storage object path).
 * Storage objects are served via `/api/media/…` so Vercel CDN caches them.
 */
export function resolveSiteMediaUrl(
  path: string | null | undefined,
  fallback = '/images/hero.png',
): string {
  return toProxiedMediaUrl(path, SITE_MEDIA_BUCKET, fallback)
}
