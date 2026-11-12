import { colorwayKey } from '@/lib/catalog/colorway'
import type { Product } from '@/lib/catalog/types'

/** Fixed booking deposit for pre-order checkouts (BDT). */
export const PREORDER_ADVANCE_BDT = 500

/** Product allows pre-order when sold out (default on). */
export function isProductPreorderEnabled(
  preorderEnabled: boolean | null | undefined,
): boolean {
  return preorderEnabled !== false
}

/** Sold-out line that can still be booked. */
export function isPreorderLine(input: {
  stock: number
  quantity: number
  preorderEnabled: boolean | null | undefined
}): boolean {
  return (
    input.stock < input.quantity &&
    isProductPreorderEnabled(input.preorderEnabled)
  )
}

/**
 * PLP listing is pre-order only: this colorway has no stock left,
 * but the product still allows booking.
 */
export function isPreorderOnlyListing(
  product: Pick<Product, 'preorderEnabled' | 'variants'>,
  listingColorwayKey: string,
): boolean {
  if (!isProductPreorderEnabled(product.preorderEnabled)) return false

  const variants = product.variants.filter(
    (variant) => colorwayKey(variant.color) === listingColorwayKey,
  )
  if (variants.length === 0) return false

  return variants.every((variant) => variant.stock < 1)
}

/** Split full order total into advance paid now vs balance due later. */
export function splitPreorderPayment(orderTotal: number): {
  amountPaid: number
  amountDue: number
} {
  const total = Math.max(0, Math.ceil(Number(orderTotal) || 0))
  const amountPaid = Math.min(PREORDER_ADVANCE_BDT, total)
  return {
    amountPaid,
    amountDue: Math.max(0, total - amountPaid),
  }
}
