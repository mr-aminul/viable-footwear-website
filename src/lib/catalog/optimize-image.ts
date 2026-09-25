import sharp from 'sharp'
import {
  IMAGE_OPTIMIZE_MAX_EDGE,
  IMAGE_OPTIMIZE_MIN_QUALITY,
  IMAGE_OPTIMIZE_TARGET_BYTES,
  IMAGE_OPTIMIZE_WEBP_QUALITY,
} from '@/lib/catalog/constants'

export type OptimizedImage = {
  buffer: Buffer
  contentType: 'image/webp'
  extension: 'webp'
  width: number
  height: number
  /** Bytes after optimization. */
  size: number
}

type EncodedWebp = {
  data: Buffer
  info: { width: number; height: number }
}

async function encodeWebp(
  bytes: Buffer,
  quality: number,
): Promise<EncodedWebp> {
  const result = await sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize({
      width: IMAGE_OPTIMIZE_MAX_EDGE,
      height: IMAGE_OPTIMIZE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true })

  return {
    data: result.data,
    info: { width: result.info.width, height: result.info.height },
  }
}

/**
 * Resize and encode as WebP for Storage.
 * Steps quality down until under the target size (or min quality).
 * Animated GIFs are left alone — return null so the caller uploads the original.
 */
export async function optimizeProductImage(
  input: Buffer | ArrayBuffer,
  sourceMime: string,
): Promise<OptimizedImage | null> {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input)

  if (sourceMime === 'image/gif') {
    const meta = await sharp(bytes, { animated: true }).metadata()
    if ((meta.pages ?? 1) > 1) return null
  }

  let quality = IMAGE_OPTIMIZE_WEBP_QUALITY
  let optimized = await encodeWebp(bytes, quality)

  while (
    optimized.data.byteLength > IMAGE_OPTIMIZE_TARGET_BYTES &&
    quality > IMAGE_OPTIMIZE_MIN_QUALITY
  ) {
    quality = Math.max(IMAGE_OPTIMIZE_MIN_QUALITY, quality - 8)
    optimized = await encodeWebp(bytes, quality)
  }

  return {
    buffer: optimized.data,
    contentType: 'image/webp',
    extension: 'webp',
    width: optimized.info.width,
    height: optimized.info.height,
    size: optimized.data.byteLength,
  }
}
