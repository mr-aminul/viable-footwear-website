import { normalizeColorHex } from '@/lib/catalog/gallery'

/**
 * Sensible solid swatches for common colorway names when no hex is stored.
 */
export const NAMED_COLOR_HEX: Record<string, string> = {
  black: '#111111',
  white: '#F5F5F5',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  navy: '#1A3668',
  blue: '#2563EB',
  red: '#DC2626',
  green: '#16A34A',
  brown: '#8B5E3C',
  tan: '#D2B48C',
  beige: '#E8DCC8',
  khaki: '#C3B091',
  taupe: '#8B7D6B',
  mocha: '#6F4E37',
  cognac: '#9A463D',
  camel: '#C19A6B',
  grey: '#6B7280',
  gray: '#6B7280',
  charcoal: '#374151',
  pink: '#DB2777',
  purple: '#7C3AED',
  yellow: '#EAB308',
  orange: '#EA580C',
  olive: '#6B8E23',
  maroon: '#7F1D1D',
  gold: '#C9A227',
  silver: '#C0C0C0',
}

/**
 * Prefer an explicit hex, then a named-color lookup from the colorway name.
 * Matches the full name, then individual words (e.g. "Khaki Suede" → khaki).
 */
export function resolveColorHex(
  colorHex: string | null | undefined,
  colorName?: string | null,
): string | null {
  const fromHex = normalizeColorHex(colorHex)
  if (fromHex) return fromHex

  const name = colorName?.trim().toLowerCase()
  if (!name) return null

  const exact = NAMED_COLOR_HEX[name]
  if (exact) return exact

  const words = name.split(/[\s/_-]+/).filter(Boolean)
  for (const word of words) {
    const fromWord = NAMED_COLOR_HEX[word]
    if (fromWord) return fromWord
  }
  return null
}
