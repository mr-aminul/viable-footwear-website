import type { Product } from '@/lib/catalog/types'
import { HOME_SECTION_PRODUCT_CAP } from '@/lib/website/constants'

/**
 * Resolve a home grid from explicit product IDs, preserving picker order.
 * Falls back when none are set or none still exist in the catalog.
 */
export function pickHomeSectionProducts(
  products: Product[],
  productIds: string[],
  fallback: Product[],
  limit = HOME_SECTION_PRODUCT_CAP,
): Product[] {
  if (productIds.length > 0) {
    const byId = new Map(products.map((product) => [product.id, product]))
    const picked = productIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product))
      .slice(0, limit)
    if (picked.length > 0) return picked
  }
  return fallback.slice(0, limit)
}

/** Legacy Most popular: featured first, else first N products. */
export function legacyMostPopularProducts(
  products: Product[],
  limit = HOME_SECTION_PRODUCT_CAP,
): Product[] {
  const featured = products.filter((product) => product.featured).slice(0, limit)
  return featured.length > 0 ? featured : products.slice(0, limit)
}

/** Legacy Foam & crocs: first N in foam/crocs/slides categories. */
export function legacyFoamCrocsProducts(
  products: Product[],
  limit = HOME_SECTION_PRODUCT_CAP,
): Product[] {
  return products
    .filter(
      (product) =>
        product.category === 'crocs' ||
        product.category === 'foam-runners' ||
        product.category === 'slides',
    )
    .slice(0, limit)
}
