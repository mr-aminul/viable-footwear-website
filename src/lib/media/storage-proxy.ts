import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'
import { SITE_MEDIA_BUCKET } from '@/lib/website/constants'

/** Public storage buckets the storefront may reference. */
export const MEDIA_PROXY_BUCKETS = [
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
  SITE_MEDIA_BUCKET,
] as const

export type MediaProxyBucket = (typeof MEDIA_PROXY_BUCKETS)[number]

const ALLOWED = new Set<string>(MEDIA_PROXY_BUCKETS)

const PUBLIC_STORAGE_RE =
  /^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^/?#]+)\/([^?#]+)(?:[?#].*)?$/i

const LEGACY_PROXY_RE = /^\/api\/media\/([^/]+)\/(.+)$/

export function isAllowedMediaBucket(
  bucket: string,
): bucket is MediaProxyBucket {
  return ALLOWED.has(bucket)
}

function supabasePublicBase(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  return base || null
}

/** Direct Supabase public object URL (no Vercel function hop). */
export function publicStorageUrl(bucket: string, objectPath: string): string {
  const base = supabasePublicBase()
  const cleaned = objectPath
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')

  if (!base) {
    // Fallback keeps old same-origin shape if env is missing at build time.
    return `/api/media/${encodeURIComponent(bucket)}/${cleaned}`
  }

  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${cleaned}`
}

/**
 * @deprecated Prefer `publicStorageUrl`. Kept for any leftover call sites /
 * redirects that still speak in proxy paths.
 */
export function mediaProxyPath(bucket: string, objectPath: string): string {
  return publicStorageUrl(bucket, objectPath)
}

/**
 * Turn a storage path, local public path, legacy `/api/media/…` path, or
 * Supabase public URL into a browser URL. Storage objects go straight to
 * Supabase so Vercel does not burn Active CPU on image bytes.
 */
export function toProxiedMediaUrl(
  path: string | null | undefined,
  bucket: MediaProxyBucket,
  fallback: string,
): string {
  if (!path) return fallback

  // Local public assets (e.g. /images/hero.png) stay on the site origin.
  if (path.startsWith('/') && !path.startsWith('/api/media/')) return path

  const legacy = path.match(LEGACY_PROXY_RE)
  if (legacy) {
    const legacyBucket = decodeURIComponent(legacy[1])
    const legacyPath = legacy[2]
      .split('/')
      .map((part) => decodeURIComponent(part))
      .join('/')
    if (isAllowedMediaBucket(legacyBucket)) {
      return publicStorageUrl(legacyBucket, legacyPath)
    }
    return fallback
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    const match = path.match(PUBLIC_STORAGE_RE)
    if (match && isAllowedMediaBucket(match[1])) {
      return publicStorageUrl(match[1], decodeURIComponent(match[2]))
    }
    return path
  }

  return publicStorageUrl(bucket, path)
}
