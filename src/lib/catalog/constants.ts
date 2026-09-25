/** Cap for “You May Also Like” tiles on PDP. */
export const RELATED_PRODUCTS_DISPLAY_CAP = 8

/** Max images per product (primary + gallery). */
export const MAX_PRODUCT_IMAGES = 12

/** Max optional product videos. */
export const MAX_PRODUCT_VIDEOS = 1

/**
 * Max original image the browser may pick (phone camera dumps).
 * Client compresses before the Server Action; server re-optimizes again.
 */
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024

/**
 * Product videos are stored as uploaded — keep this low so Storage stays lean.
 * Prefer short, already-compressed clips (or compress externally first).
 */
export const VIDEO_MAX_BYTES = 12 * 1024 * 1024

/** Longest edge after optimization (covers retina PDP without huge files). */
export const IMAGE_OPTIMIZE_MAX_EDGE = 1600

/** Starting WebP quality; server may step down to hit the byte target. */
export const IMAGE_OPTIMIZE_WEBP_QUALITY = 78

/** Floor quality when iterating toward the storage target. */
export const IMAGE_OPTIMIZE_MIN_QUALITY = 55

/** Soft target for stored product images (~400KB). */
export const IMAGE_OPTIMIZE_TARGET_BYTES = 400 * 1024

/** Client pre-compress longest edge (matches server). */
export const CLIENT_IMAGE_MAX_EDGE = IMAGE_OPTIMIZE_MAX_EDGE

/** Client pre-compress target before upload (~500KB keeps Server Action small). */
export const CLIENT_IMAGE_TARGET_BYTES = 500 * 1024

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const

export const PRODUCT_IMAGE_BUCKET = 'product-images'
export const PRODUCT_VIDEO_BUCKET = 'product-videos'

export type ProductBadge = 'New' | 'Sale' | 'Bestseller'
