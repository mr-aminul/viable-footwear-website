import sharp from 'sharp'
import {
  MEDIA_WIDTHS,
  parseMediaWidth,
  type MediaWidth,
} from '@/lib/media/widths'

export { MEDIA_WIDTHS, parseMediaWidth, type MediaWidth }

export function canResizeContentType(contentType: string): boolean {
  const type = contentType.toLowerCase().split(';')[0]?.trim() ?? ''
  if (!type.startsWith('image/')) return false
  // Keep animated GIFs and SVG as-is.
  if (type === 'image/gif' || type === 'image/svg+xml') return false
  return true
}

/**
 * Downscale for thumbs/cards at upload time. Never enlarges. WebP for transfer.
 * Do not call this from the public media route — that path must stay light.
 */
export async function resizeMediaImage(
  bytes: Buffer,
  width: MediaWidth,
): Promise<{ buffer: Buffer; contentType: 'image/webp' }> {
  const result = await sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize({
      width,
      height: width,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 72,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer()

  return { buffer: result, contentType: 'image/webp' }
}
