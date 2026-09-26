/** Max hero slideshow slides. */
export const MAX_HERO_SLIDES = 6

/** Default autoplay interval for hero slideshow (ms). */
export const DEFAULT_SLIDE_INTERVAL_MS = 5000

export const SITE_MEDIA_BUCKET = 'site-media'

export const SITE_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const SITE_VIDEO_MAX_BYTES = 24 * 1024 * 1024

export const SITE_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const SITE_ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const

export type SitePageKey = 'home' | 'about' | 'site'

export const SITE_PAGE_KEYS: SitePageKey[] = ['home', 'about', 'site']
