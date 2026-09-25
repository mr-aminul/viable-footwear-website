import { colorwayKey } from '@/lib/catalog/colorway'

/**
 * Normalize a hex swatch for storage / matching (#RRGGBB uppercase).
 */
export function normalizeColorHex(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`
  return null
}

export { colorwayKey }

export type ColorTaggedImage = {
  url: string
  colorHex: string | null
}

export type ColorwayVariantImage = {
  color: string | null
  imageUrl: string | null
}

/**
 * Gallery for a selected colorway: variant photos for that color first,
 * then any remaining product gallery images as fallback.
 */
export function galleryForColorway(
  variants: ColorwayVariantImage[],
  images: Array<{ url: string }>,
  selectedColorKey: string | null | undefined,
  fallbackImage: string,
): string[] {
  if (selectedColorKey) {
    const fromVariants = [
      ...new Set(
        variants
          .filter(
            (v) =>
              colorwayKey(v.color) === selectedColorKey && Boolean(v.imageUrl),
          )
          .map((v) => v.imageUrl as string),
      ),
    ]
    if (fromVariants.length > 0) return fromVariants
  }

  if (images.length > 0) return images.map((img) => img.url)
  return [fallbackImage]
}

/**
 * @deprecated Prefer galleryForColorway — images are per-variant, not hex-tagged.
 * Kept for any leftover callers that still match on color_hex.
 */
export function galleryForColor(
  images: ColorTaggedImage[],
  colorKey: string | null | undefined,
): string[] {
  if (images.length === 0) return []

  const hex = normalizeColorHex(colorKey)
  const matching = hex
    ? images.filter((img) => normalizeColorHex(img.colorHex) === hex)
    : []
  const shared = images.filter((img) => !normalizeColorHex(img.colorHex))

  if (matching.length > 0) {
    return [...matching, ...shared].map((img) => img.url)
  }
  if (shared.length > 0) return shared.map((img) => img.url)
  return images.map((img) => img.url)
}
