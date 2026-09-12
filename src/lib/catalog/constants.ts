/** Cap for “You May Also Like” tiles on PDP. */
export const RELATED_PRODUCTS_DISPLAY_CAP = 8

/** Max images per product (primary + gallery). */
export const MAX_PRODUCT_IMAGES = 12

/** Max optional product videos. */
export const MAX_PRODUCT_VIDEOS = 1

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024

/** Longest edge after upload optimization (retina-friendly for PDP). */
export const IMAGE_OPTIMIZE_MAX_EDGE = 2048

/**
 * WebP quality for product images.
 * 85 keeps product photos looking sharp while cutting file size vs JPEG/PNG.
 */
export const IMAGE_OPTIMIZE_WEBP_QUALITY = 85

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
