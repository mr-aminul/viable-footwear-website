import { SITE_MEDIA_BUCKET } from '@/lib/website/constants'

/**
 * Resolve a site media path (public `/…`, absolute URL, or storage object path).
 */
export function resolveSiteMediaUrl(
  path: string | null | undefined,
  fallback = '/images/hero.png',
): string {
  if (!path) return fallback
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('/')
  ) {
    return path
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return path
  return `${base}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/${path}`
}
