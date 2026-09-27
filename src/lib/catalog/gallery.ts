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
  /** Colorway name this image belongs to (null = shared / unassigned). */
  color: string | null
  /** @deprecated Prefer `color` — hex was an earlier tagging attempt. */
  colorHex?: string | null
}

export type ColorwayVariantImage = {
  color: string | null
  imageUrl: string | null
}

/**
 * Gallery for a selected colorway.
 * Only that color’s photos (tagged media, then variant thumbs) — never other colors.
 */
export function galleryForColorway(
  variants: ColorwayVariantImage[],
  images: ColorTaggedImage[],
  selectedColorKey: string | null | undefined,
  fallbackImage: string,
): string[] {
  const galleryUrls = images.map((img) => img.url)

  if (!selectedColorKey) {
    if (galleryUrls.length > 0) return galleryUrls
    return [fallbackImage]
  }

  const taggedForColor = [
    ...new Set(
      images
        .filter(
          (img) =>
            Boolean(img.color?.trim()) &&
            colorwayKey(img.color) === selectedColorKey,
        )
        .map((img) => img.url),
    ),
  ]
  if (taggedForColor.length > 0) return taggedForColor

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

  // No color-specific media yet — show untagged images only, never other colors.
  const otherColorUrls = new Set<string>()
  for (const img of images) {
    if (img.color?.trim() && colorwayKey(img.color) !== selectedColorKey) {
      otherColorUrls.add(img.url)
    }
  }
  for (const v of variants) {
    if (colorwayKey(v.color) !== selectedColorKey && v.imageUrl) {
      otherColorUrls.add(v.imageUrl)
    }
  }

  const shared = galleryUrls.filter((url) => !otherColorUrls.has(url))
  if (shared.length > 0) return shared
  return [fallbackImage]
}

/**
 * @deprecated Prefer galleryForColorway with name-tagged `color` on images.
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
