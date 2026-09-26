import type { ProductBadge } from '@/lib/catalog/constants'

/** Storefront gallery image; colorHex tags a colorway (null = shared). */
export type ProductImage = {
  url: string
  colorHex: string | null
}

/** Storefront-facing product (cart + cards + PDP). */
export type Product = {
  id: string
  name: string
  slug: string
  category: string
  categoryLabel: string
  price: number
  compareAt?: number
  image: string
  images: ProductImage[]
  videoUrl?: string
  colors: string[]
  sizes: number[]
  /** Active variants for stock-aware add-to-cart. */
  variants: ProductVariantView[]
  badge: ProductBadge
  description: string
  /** Material/style line under the title (e.g. “suede”). */
  subtitle?: string
  /** Tip banner above size selectors (e.g. sizing note). */
  note?: string
  /** Materials accordion body. */
  materials?: string
  /** Care / manufacturer accordion body. */
  careInfo?: string
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
  /** Gallery image assigned to this variant (color photo). */
  imageUrl: string | null
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

/** Admin picker row for You May Also Like. */
export type RelatedProductOption = {
  id: string
  name: string
  slug: string
  active: boolean
}

/** Flat variant row for the admin Inventory page. */
export type AdminInventoryRow = {
  variantId: string
  productId: string
  productName: string
  productSlug: string
  productActive: boolean
  sizeEu: number
  color: string | null
  colorHex: string | null
  sku: string | null
  stock: number
  variantActive: boolean
}
