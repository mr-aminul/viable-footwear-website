import sharp from 'sharp'
import { normalizeColorHex } from '@/lib/catalog/gallery'

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`.toUpperCase()
}

function isBackgroundPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return true
  // Studio white / near-white
  if (r > 240 && g > 240 && b > 240) return true
  // Soft light grey seamless paper
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (min > 225 && max - min < 18) return true
  return false
}

/**
 * Derive a #RRGGBB swatch from a product photo.
 * Skips transparent / near-white studio backgrounds so the shoe color wins.
 */
export async function extractDominantColor(
  input: Buffer | ArrayBuffer,
): Promise<string | null> {
  try {
    const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input)
    const { data, info } = await sharp(bytes, { failOn: 'none' })
      .rotate()
      .resize(48, 48, { fit: 'inside', withoutEnlargement: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const channels = info.channels
    if (channels < 3) return null

    let rSum = 0
    let gSum = 0
    let bSum = 0
    let count = 0

    let rAll = 0
    let gAll = 0
    let bAll = 0
    let opaque = 0

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const a = channels > 3 ? data[i + 3]! : 255

      if (a < 128) continue
      rAll += r
      gAll += g
      bAll += b
      opaque += 1

      if (isBackgroundPixel(r, g, b, a)) continue
      rSum += r
      gSum += g
      bSum += b
      count += 1
    }

    if (count >= 8) {
      return normalizeColorHex(toHex(rSum / count, gSum / count, bSum / count))
    }
    if (opaque >= 8) {
      return normalizeColorHex(toHex(rAll / opaque, gAll / opaque, bAll / opaque))
    }
    return null
  } catch {
    return null
  }
}
