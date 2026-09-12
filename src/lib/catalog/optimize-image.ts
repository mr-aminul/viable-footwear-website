import sharp from 'sharp'
import {
  IMAGE_OPTIMIZE_MAX_EDGE,
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

/**
 * Resize (if needed) and encode as high-quality WebP for Storage.
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

  const image = sharp(bytes, { failOn: 'none' }).rotate()

  const optimized = await image
    .resize({
      width: IMAGE_OPTIMIZE_MAX_EDGE,
      height: IMAGE_OPTIMIZE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: IMAGE_OPTIMIZE_WEBP_QUALITY,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: optimized.data,
    contentType: 'image/webp',
    extension: 'webp',
    width: optimized.info.width,
    height: optimized.info.height,
    size: optimized.data.byteLength,
  }
}
