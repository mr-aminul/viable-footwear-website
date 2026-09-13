/**
 * COD checkout totals — Pathao delivery → optional campaign → COD inflate → ceil.
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
  const goodsPlusDelivery = Math.max(0, subtotal) + delivery
  const inflated = goodsPlusDelivery / 0.99
  const total = Math.ceil(inflated)
  const shipping = total - Math.max(0, subtotal)
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
