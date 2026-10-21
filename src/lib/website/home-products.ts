import type { Product } from '@/lib/catalog/types'
import {
  expandProductsByColorway,
  type ProductColorwayListing,
} from '@/lib/catalog/product-colorways'
import { HOME_SECTION_PRODUCT_CAP } from '@/lib/website/constants'

/**
 * Resolve a home grid from explicit product IDs only.
 * Empty selection = empty section (no automatic fallback).
 * Each colorway of a picked product becomes its own tile (capped).
 */
export function pickHomeSectionProducts(
  products: Product[],
  productIds: string[],
  limit = HOME_SECTION_PRODUCT_CAP,
): ProductColorwayListing[] {
  if (productIds.length === 0) return []
  const byId = new Map(products.map((product) => [product.id, product]))
  const ordered = productIds
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product))
  return expandProductsByColorway(ordered, limit)
}
