import {
  MEDIA_WIDTHS,
  resizeMediaImage,
  type MediaWidth,
} from '@/lib/media/resize'
import {
  deleteObjects,
  uploadObject,
} from '@/lib/media/object-store'

/**
 * Pre-built thumb/card sizes written at upload time.
 * Request path never runs Sharp — it only fetches these (or the original).
 */
export const UPLOAD_VARIANT_WIDTHS: readonly MediaWidth[] = [
  64, 96, 128, 256, 384, 640, 828, 1200,
]

/** `product/uuid.webp` → `product/uuid.w640.webp` */
export function mediaVariantObjectPath(
  objectPath: string,
  width: MediaWidth,
): string {
  const cleaned = objectPath.replace(/^\/+/, '')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastDot <= 0) return `${cleaned}.w${width}.webp`
  return `${cleaned.slice(0, lastDot)}.w${width}.webp`
}

/** Original + every whitelisted width variant (for deletes). */
export function mediaObjectPathsIncludingVariants(
  objectPath: string,
): string[] {
  const cleaned = objectPath.replace(/^\/+/, '')
  if (!cleaned || cleaned.startsWith('http') || cleaned.startsWith('/')) {
    return []
  }
  return [
    cleaned,
    ...MEDIA_WIDTHS.map((width) => mediaVariantObjectPath(cleaned, width)),
  ]
}

/**
 * Write CDN-friendly width variants next to the master object.
 * Runs only on admin upload — never on customer page views.
 */
export async function uploadImageWidthVariants(input: {
  bucket: string
  objectPath: string
  bytes: Buffer
}): Promise<void> {
  for (const width of UPLOAD_VARIANT_WIDTHS) {
    try {
      const resized = await resizeMediaImage(input.bytes, width)
      const uploaded = await uploadObject({
        bucket: input.bucket,
        path: mediaVariantObjectPath(input.objectPath, width),
        body: resized.buffer,
        contentType: resized.contentType,
      })
      if (!uploaded.ok) {
        console.error(
          `[media] variant w=${width} upload failed:`,
          uploaded.error,
        )
      }
    } catch (error) {
      console.error(`[media] variant w=${width} encode failed:`, error)
    }
  }
}

/** Best-effort remove master + width siblings. */
export async function deleteImageWithVariants(
  bucket: string,
  objectPath: string,
): Promise<void> {
  const paths = mediaObjectPathsIncludingVariants(objectPath)
  if (paths.length === 0) return
  await deleteObjects(bucket, paths)
}
