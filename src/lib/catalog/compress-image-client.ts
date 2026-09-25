import {
  CLIENT_IMAGE_MAX_EDGE,
  CLIENT_IMAGE_TARGET_BYTES,
} from '@/lib/catalog/constants'

function supportsWebpEncode(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

/**
 * Browser-side resize + encode so Server Actions receive a small payload
 * and Storage never sees multi-MB camera originals.
 * Animated GIFs and non-images are returned unchanged.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file
  }

  // Already small enough — skip the canvas pass.
  if (file.size <= CLIENT_IMAGE_TARGET_BYTES) {
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(
    1,
    CLIENT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const preferWebp = supportsWebpEncode()
  const mime = preferWebp ? 'image/webp' : 'image/jpeg'
  const extension = preferWebp ? 'webp' : 'jpg'

  let quality = 0.82
  let blob = await canvasToBlob(canvas, mime, quality)

  while (
    blob &&
    blob.size > CLIENT_IMAGE_TARGET_BYTES &&
    quality > 0.55
  ) {
    quality = Math.max(0.55, quality - 0.08)
    blob = await canvasToBlob(canvas, mime, quality)
  }

  if (!blob || blob.size >= file.size) {
    return file
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product'
  return new File([blob], `${baseName}.${extension}`, {
    type: mime,
    lastModified: Date.now(),
  })
}

/**
 * Prepare a gallery/variant file for upload: compress images, pass videos through.
 */
export async function prepareMediaFileForUpload(file: File): Promise<{
  file: File
  warning?: string
}> {
  if (file.type.startsWith('video/')) {
    return {
      file,
      warning:
        'Videos are stored as-is. Prefer short, compressed clips under 12MB.',
    }
  }

  const compressed = await compressImageForUpload(file)
  return { file: compressed }
}
