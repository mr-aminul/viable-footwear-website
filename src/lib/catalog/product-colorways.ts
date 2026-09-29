import { colorwayKey } from '@/lib/catalog/colorway'
import { resolveColorHex } from '@/lib/catalog/named-color-hex'
import type { Product, ProductImage, ProductVariantView } from '@/lib/catalog/types'

export type ProductColorwayOption = {
  key: string
  name: string | null
  /** Lead image for this colorway (card image swap). */
  imageUrl: string | null
  /** Solid swatch fill. */
  colorHex: string | null
}

type ColorwayAccum = {
  name: string | null
  imageUrl: string | null
  colorHex: string | null
}

function firstGalleryForColor(
  images: ProductImage[],
  key: string,
): ProductImage | undefined {
  return images.find(
    (img) => Boolean(img.color?.trim()) && colorwayKey(img.color) === key,
  )
}

/**
 * Unique colorways for a product — used by listing cards and the PDP picker.
 */
export function productColorways(
  product: Pick<Product, 'variants' | 'images' | 'colors'>,
): ProductColorwayOption[] {
  const unique = new Map<string, ColorwayAccum>()

  const upsert = (
    key: string,
    next: Partial<ColorwayAccum> & { name?: string | null },
  ) => {
    const existing = unique.get(key)
    const nextHex = resolveColorHex(next.colorHex, next.name)
    if (!existing) {
      unique.set(key, {
        name: next.name?.trim() || null,
        imageUrl: next.imageUrl ?? null,
        colorHex: nextHex,
      })
      return
    }
    if (!existing.name && next.name?.trim()) {
      existing.name = next.name.trim()
    }
    if (!existing.imageUrl && next.imageUrl) {
      existing.imageUrl = next.imageUrl
    }
    // Gallery-derived hex should win over variant name defaults.
    if (nextHex && (!existing.colorHex || next.imageUrl)) {
      existing.colorHex = nextHex
    } else if (!existing.colorHex) {
      existing.colorHex = resolveColorHex(null, existing.name)
    }
  }

  for (const variant of product.variants) {
    const key = colorwayKey(variant.color)
    const fromGallery = firstGalleryForColor(product.images, key)
    upsert(key, {
      name: variant.color,
      imageUrl: fromGallery?.url ?? variant.imageUrl,
      colorHex: fromGallery?.colorHex ?? variant.colorHex,
    })
  }

  for (const image of product.images) {
    if (!image.color?.trim()) continue
    const key = colorwayKey(image.color)
    upsert(key, {
      name: image.color,
      imageUrl: image.url,
      colorHex: image.colorHex,
    })
  }

  if (unique.size === 0 && product.colors.length > 0) {
    for (const color of product.colors) {
      upsert(colorwayKey(color), { name: color })
    }
  }

  return [...unique.entries()].map(([key, value]) => ({
    key,
    name: value.name,
    imageUrl: value.imageUrl,
    colorHex:
      value.colorHex ?? resolveColorHex(null, value.name),
  }))
}

/** First in-stock (or any) variant matching a colorway key. */
export function variantForColorway(
  variants: ProductVariantView[],
  colorKey: string,
  preferredSizeEu?: number | null,
): ProductVariantView | undefined {
  const matches = variants.filter((v) => colorwayKey(v.color) === colorKey)
  if (matches.length === 0) return undefined

  if (preferredSizeEu != null) {
    const sized =
      matches.find((v) => v.sizeEu === preferredSizeEu && v.stock > 0) ??
      matches.find((v) => v.sizeEu === preferredSizeEu)
    if (sized) return sized
  }

  return (
    matches.find((v) => v.stock > 0) ??
    matches[0]
  )
}
