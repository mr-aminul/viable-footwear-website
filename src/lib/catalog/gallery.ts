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

export type ColorTaggedImage = {
  url: string
  colorHex: string | null
}

/**
 * Gallery for a selected colorway: color-tagged images first, then shared
 * (untagged). Falls back to all images if nothing matches.
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
