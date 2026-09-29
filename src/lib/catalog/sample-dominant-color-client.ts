/**
 * Sample a product photo in the browser and return a #RRGGBB swatch.
 * Skips near-white studio backgrounds. Requires CORS on the image host.
 */
export async function sampleDominantColorFromUrl(
  url: string,
): Promise<string | null> {
  try {
    const image = await loadImage(url)
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    const scale = Math.min(size / image.width, size / image.height)
    const w = Math.max(1, Math.round(image.width * scale))
    const h = Math.max(1, Math.round(image.height * scale))
    const ox = Math.floor((size - w) / 2)
    const oy = Math.floor((size - h) / 2)
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(image, ox, oy, w, h)

    const { data } = ctx.getImageData(0, 0, size, size)
    let rSum = 0
    let gSum = 0
    let bSum = 0
    let count = 0
    let rAll = 0
    let gAll = 0
    let bAll = 0
    let opaque = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const a = data[i + 3]!
      if (a < 128) continue

      rAll += r
      gAll += g
      bAll += b
      opaque += 1

      if (isBackgroundPixel(r, g, b)) continue
      rSum += r
      gSum += g
      bSum += b
      count += 1
    }

    if (count >= 8) return toHex(rSum / count, gSum / count, bSum / count)
    if (opaque >= 8) return toHex(rAll / opaque, gAll / opaque, bAll / opaque)
    return null
  } catch {
    return null
  }
}

function isBackgroundPixel(r: number, g: number, b: number): boolean {
  if (r > 240 && g > 240 && b > 240) return true
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return min > 225 && max - min < 18
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`.toUpperCase()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = url
  })
}
