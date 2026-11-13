import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
} from '@/lib/catalog/constants'
import { SITE_MEDIA_BUCKET } from '@/lib/website/constants'
import { mediaPublicBaseUrl } from '@/lib/media/object-store'
import {
  isMediaVariantObjectPath,
  mediaVariantObjectPath,
  parseMediaWidth,
} from '@/lib/media/widths'

/** Buckets the storefront may proxy (never open-ended). */
export const MEDIA_PROXY_BUCKETS = [
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_VIDEO_BUCKET,
  SITE_MEDIA_BUCKET,
] as const

export type MediaProxyBucket = (typeof MEDIA_PROXY_BUCKETS)[number]

const ALLOWED = new Set<string>(MEDIA_PROXY_BUCKETS)

const PUBLIC_STORAGE_RE =
  /^https?:\/\/[^/]+\/(?:storage\/v1\/object\/public\/)?([^/?#]+)\/([^?#]+)(?:[?#].*)?$/i

const LEGACY_PROXY_RE = /^\/api\/media\/([^/]+)\/(.+)$/

export function isAllowedMediaBucket(
  bucket: string,
): bucket is MediaProxyBucket {
  return ALLOWED.has(bucket)
}

function encodeObjectPath(objectPath: string): string {
  return objectPath
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
}

/**
 * Upstream origin URL for a storage object on VPS MinIO.
 * Never put this in HTML — browsers use `mediaProxyPath` instead.
 */
export function publicStorageUrl(
  bucket: string,
  objectPath: string,
): string | null {
  const cleaned = encodeObjectPath(objectPath)
  const mediaBase = mediaPublicBaseUrl()
  if (!mediaBase) return null
  return `${mediaBase}/${encodeURIComponent(bucket)}/${cleaned}`
}

/** Same-origin browser URL so Vercel CDN absorbs repeat traffic. */
export function mediaProxyPath(bucket: string, objectPath: string): string {
  return `/api/media/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`
}

/**
 * Point a proxied media URL at a pre-built width variant object
 * (`….w640.webp`) so Caddy/MinIO can serve it without Node.
 * Non-proxy URLs (local `/images/…`, absolute third-party) are unchanged.
 * Legacy `?w=` query strings are stripped — width lives in the object path.
 */
export function withMediaWidth(
  url: string,
  width: number | null | undefined,
): string {
  const snapped = parseMediaWidth(width)
  if (!snapped) {
    // Drop legacy ?w= if present so MinIO/Caddy get a clean object path.
    if (url.startsWith('/api/media/') && url.includes('?')) {
      try {
        const parsed = new URL(url, 'http://local.invalid')
        parsed.searchParams.delete('w')
        const search = parsed.searchParams.toString()
        return search ? `${parsed.pathname}?${search}` : parsed.pathname
      } catch {
        return url
      }
    }
    return url
  }
  if (!url.startsWith('/api/media/')) return url

  try {
    const parsed = new URL(url, 'http://local.invalid')
    const parts = parsed.pathname.split('/').filter(Boolean)
    // ["api", "media", bucket, ...object]
    if (parts.length < 4 || parts[0] !== 'api' || parts[1] !== 'media') {
      return url
    }
    const bucket = decodeURIComponent(parts[2])
    const objectPath = parts
      .slice(3)
      .map((part) => decodeURIComponent(part))
      .join('/')
    if (!isAllowedMediaBucket(bucket) || !objectPath) return url
    if (isMediaVariantObjectPath(objectPath)) {
      return mediaProxyPath(bucket, objectPath)
    }
    return mediaProxyPath(bucket, mediaVariantObjectPath(objectPath, snapped))
  } catch {
    return url
  }
}

/**
 * Turn a storage path, local public path, legacy `/api/media/…` path, or
 * absolute storage URL into a same-origin proxied URL.
 */
export function toProxiedMediaUrl(
  path: string | null | undefined,
  bucket: MediaProxyBucket,
  fallback: string,
): string {
  if (!path) return fallback

  if (path.startsWith('/api/media/')) return path

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
      return mediaProxyPath(legacyBucket, legacyPath)
    }
    return fallback
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    const mediaBase = mediaPublicBaseUrl()
    if (mediaBase && path.startsWith(`${mediaBase}/`)) {
      const rest = path.slice(mediaBase.length + 1)
      const slash = rest.indexOf('/')
      if (slash > 0) {
        const b = decodeURIComponent(rest.slice(0, slash))
        const objectPath = rest
          .slice(slash + 1)
          .split('/')
          .map((part) => decodeURIComponent(part))
          .join('/')
        if (isAllowedMediaBucket(b)) {
          return mediaProxyPath(b, objectPath)
        }
      }
    }

    const generic = path.match(PUBLIC_STORAGE_RE)
    if (generic && isAllowedMediaBucket(generic[1])) {
      return mediaProxyPath(generic[1], decodeURIComponent(generic[2]))
    }

    return path
  }

  return mediaProxyPath(bucket, path)
}
