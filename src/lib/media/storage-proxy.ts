import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'
import { SITE_MEDIA_BUCKET } from '@/lib/website/constants'

/** Buckets the storefront may proxy (never open-ended). */
export const MEDIA_PROXY_BUCKETS = [
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
  SITE_MEDIA_BUCKET,
] as const

export type MediaProxyBucket = (typeof MEDIA_PROXY_BUCKETS)[number]

const ALLOWED = new Set<string>(MEDIA_PROXY_BUCKETS)

const PUBLIC_STORAGE_RE =
  /^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^/?#]+)\/([^?#]+)(?:[?#].*)?$/i

export function isAllowedMediaBucket(
  bucket: string,
): bucket is MediaProxyBucket {
  return ALLOWED.has(bucket)
}

/** Browser URL that hits our cached proxy instead of Supabase CDN. */
export function mediaProxyPath(bucket: string, objectPath: string): string {
  const encoded = objectPath
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
  return `/api/media/${encodeURIComponent(bucket)}/${encoded}`
}

/**
 * Turn a storage path, local public path, or legacy Supabase public URL into a
 * same-origin URL so browsers do not pull from Supabase Cached Egress.
 */
export function toProxiedMediaUrl(
  path: string | null | undefined,
  bucket: MediaProxyBucket,
  fallback: string,
): string {
  if (!path) return fallback

  if (path.startsWith('/api/media/')) return path

  // Local public assets (e.g. /images/hero.png) stay on the site origin.
  if (path.startsWith('/')) return path

  if (path.startsWith('http://') || path.startsWith('https://')) {
    const match = path.match(PUBLIC_STORAGE_RE)
    if (match && isAllowedMediaBucket(match[1])) {
      return mediaProxyPath(match[1], decodeURIComponent(match[2]))
    }
    return path
  }

  return mediaProxyPath(bucket, path)
}
