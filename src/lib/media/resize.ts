import sharp from 'sharp'

/**
 * Whitelisted longest-edge widths for `/api/media/…?w=`.
 * Keeps CDN variants few and predictable.
 */
export const MEDIA_WIDTHS = [
  64, 96, 128, 256, 384, 640, 828, 1200, 1600,
] as const

export type MediaWidth = (typeof MEDIA_WIDTHS)[number]

const WIDTH_SET = new Set<number>(MEDIA_WIDTHS)

/** Parse `?w=` to a allowed width, or null for original. */
export function parseMediaWidth(
  raw: string | null | undefined,
): MediaWidth | null {
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  if (WIDTH_SET.has(n)) return n as MediaWidth

  // Snap to nearest allowed width (prefer not upsizing past request).
  let best: MediaWidth = MEDIA_WIDTHS[0]
  for (const w of MEDIA_WIDTHS) {
    if (w <= n) best = w
    else break
  }
  return best
}

export function canResizeContentType(contentType: string): boolean {
  const type = contentType.toLowerCase().split(';')[0]?.trim() ?? ''
  if (!type.startsWith('image/')) return false
  // Keep animated GIFs and SVG as-is.
  if (type === 'image/gif' || type === 'image/svg+xml') return false
  return true
}

/**
 * Downscale for thumbs/cards. Never enlarges. WebP for smaller transfer.
 */
export async function resizeMediaImage(
  bytes: Buffer,
  width: MediaWidth,
): Promise<{ buffer: Buffer; contentType: 'image/webp' }> {
  const result = await sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize({
      width,
      height: width,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 72,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer()

  return { buffer: result, contentType: 'image/webp' }
}
