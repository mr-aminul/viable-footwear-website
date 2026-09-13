/**
 * COD checkout totals — same method as Chilirig.
 *
 * Pathao keeps ~1% of amount_to_collect as COD fee. We inflate the payable total
 * so after that fee the merchant still nets (subtotal + Pathao delivery).
 * Final customer charge is ROUNDUP (ceil) per Viable requirements.
 */
export function computeCodCheckoutTotals(
  subtotal: number,
  pathaoDeliveryFee: number,
): {
  pathaoDeliveryFee: number
  shipping: number
  total: number
} {
  const goodsPlusDelivery = Math.max(0, subtotal) + Math.max(0, pathaoDeliveryFee)
  const inflated = goodsPlusDelivery / 0.99
  const total = Math.ceil(inflated)
  const shipping = total - Math.max(0, subtotal)
  return {
    pathaoDeliveryFee: Math.max(0, pathaoDeliveryFee),
    shipping,
    total,
  }
}

export const PATHAO_ADDRESS_MAX_LENGTH = 220

export function isValidBdMobile(digits: string): boolean {
  return digits.length === 11 && digits.startsWith('01')
}
