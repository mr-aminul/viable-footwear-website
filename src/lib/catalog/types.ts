import type { ProductBadge } from '@/lib/catalog/constants'

/** Storefront-facing product (cart + cards + PDP). */
export type Product = {
  id: string
  name: string
  slug: string
  category: string
  categoryLabel: string
  price: number
  compareAt?: number
  rating: number
  reviews: number
  image: string
  images: string[]
  videoUrl?: string
  colors: string[]
  sizes: number[]
  /** Active variants for stock-aware add-to-cart. */
  variants: ProductVariantView[]
  badge?: ProductBadge
  description: string
  featured?: boolean
  weightKg: number
  seoTitle?: string
  seoDescription?: string
}

export type ProductVariantView = {
  id: string
  sizeEu: number
  color: string | null
  colorHex: string | null
  stock: number
  sku: string | null
}

export type CategoryView = {
  id: string
  name: string
  slug: string
  image: string
  count: number
  seoTitle?: string
  seoDescription?: string
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }
