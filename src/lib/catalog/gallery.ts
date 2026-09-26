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
 * Gallery for a selected colorway: that color’s variant photos first,
 * then product gallery images that aren’t claimed by another colorway.
 * (Previously returned only variant photos, which hid the left-side gallery.)
 */
export function galleryForColorway(
  variants: ColorwayVariantImage[],
  images: Array<{ url: string }>,
  selectedColorKey: string | null | undefined,
  fallbackImage: string,
): string[] {
  const galleryUrls = images.map((img) => img.url)

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

    const otherColorImages = new Set(
      variants
        .filter(
          (v) =>
            colorwayKey(v.color) !== selectedColorKey && Boolean(v.imageUrl),
        )
        .map((v) => v.imageUrl as string),
    )

    const sharedGallery = galleryUrls.filter(
      (url) => !otherColorImages.has(url),
    )

    if (fromVariants.length > 0) {
      const rest = sharedGallery.filter((url) => !fromVariants.includes(url))
      return [...fromVariants, ...rest]
    }

    if (sharedGallery.length > 0) return sharedGallery
  }

  if (galleryUrls.length > 0) return galleryUrls
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
