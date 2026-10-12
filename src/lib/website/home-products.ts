import type { Product } from '@/lib/catalog/types'
import { HOME_SECTION_PRODUCT_CAP } from '@/lib/website/constants'

/**
 * Resolve a home grid from explicit product IDs only.
 * Empty selection = empty section (no automatic fallback).
 */
export function pickHomeSectionProducts(
  products: Product[],
  productIds: string[],
  limit = HOME_SECTION_PRODUCT_CAP,
): Product[] {
  if (productIds.length === 0) return []
  const byId = new Map(products.map((product) => [product.id, product]))
  return productIds
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product))
    .slice(0, limit)
}
