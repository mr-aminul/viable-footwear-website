/** Round up to the next multiple of 10 (e.g. 132 → 140). */
export function ceilToNearestTen(amount: number): number {
  if (amount <= 0) return 0
  return Math.ceil(amount / 10) * 10
}

/**
 * COD checkout totals — Pathao delivery → optional campaign → COD inflate →
 * ceil to taka → round delivery charge up to nearest ৳10.
 */
export function computeCodCheckoutTotals(
  subtotal: number,
  deliveryFeeAfterCampaign: number,
): {
  deliveryFee: number
  shipping: number
  total: number
} {
  const delivery = Math.max(0, deliveryFeeAfterCampaign)
  const goods = Math.max(0, subtotal)
  const goodsPlusDelivery = goods + delivery
  const inflated = goodsPlusDelivery / 0.99
  const totalBeforeDeliveryRound = Math.ceil(inflated)
  const shipping = ceilToNearestTen(totalBeforeDeliveryRound - goods)
  const total = goods + shipping
  return {
    deliveryFee: delivery,
    shipping,
    total,
  }
}

/** @deprecated alias — prefer deliveryFeeAfterCampaign naming */
export function computeCodCheckoutTotalsLegacy(
  subtotal: number,
  pathaoDeliveryFee: number,
) {
  const r = computeCodCheckoutTotals(subtotal, pathaoDeliveryFee)
  return {
    pathaoDeliveryFee: pathaoDeliveryFee,
    shipping: r.shipping,
    total: r.total,
  }
}

export const PATHAO_ADDRESS_MAX_LENGTH = 220

export function isValidBdMobile(digits: string): boolean {
  return digits.length === 11 && digits.startsWith('01')
}
