/**
 * Whitelisted longest-edge widths for media variants (`*.w{N}.webp`).
 * Kept free of Sharp so client components can import safely.
 */
export const MEDIA_WIDTHS = [
  64, 96, 128, 256, 384, 640, 828, 1200, 1600,
] as const

export type MediaWidth = (typeof MEDIA_WIDTHS)[number]

const WIDTH_SET = new Set<number>(MEDIA_WIDTHS)

/** Parse a width hint to an allowed width, or null for original. */
export function parseMediaWidth(
  raw: string | number | null | undefined,
): MediaWidth | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
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

/** `product/uuid.webp` → `product/uuid.w640.webp` */
export function mediaVariantObjectPath(
  objectPath: string,
  width: MediaWidth,
): string {
  const cleaned = objectPath.replace(/^\/+/, '')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastDot <= 0) return `${cleaned}.w${width}.webp`
  return `${cleaned.slice(0, lastDot)}.w${width}.webp`
}

/** True when the object path already points at a width variant. */
export function isMediaVariantObjectPath(objectPath: string): boolean {
  return /\.w\d+\.webp$/i.test(objectPath.replace(/^\/+/, ''))
}
