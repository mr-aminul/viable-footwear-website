import type { ProductBadge } from '@/lib/catalog/constants'

export const PRODUCT_BADGE_OPTIONS: readonly ProductBadge[] = [
  'New',
  'Sale',
  'Bestseller',
] as const

export const DEFAULT_PRODUCT_BADGE: ProductBadge = 'New'

/**
 * Normalize DB / form badge values. Missing values default to New.
 */
export function normalizeProductBadge(
  value: string | null | undefined,
): ProductBadge {
  if (value === 'Sale' || value === 'Bestseller' || value === 'New') return value
  return DEFAULT_PRODUCT_BADGE
}

/**
 * Shared chip colors for storefront + admin (edit & view).
 * New = navy, Sale = spark red, Bestseller = charcoal ink.
 */
export function productBadgeClassName(badge: ProductBadge | string): string {
  switch (badge) {
    case 'Sale':
      return 'bg-spark text-white'
    case 'Bestseller':
      return 'bg-ink text-white'
    case 'New':
    default:
      return 'bg-navy text-white'
  }
}
