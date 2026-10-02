/**
 * COD checkout totals — fixed website delivery (after campaign), then ceil total.
 * Delivery is charged flat (ISD/Suburb/OSD); no COD inflate folded into shipping.
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
  const shipping = delivery
  const total = Math.ceil(goods + shipping)
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
