/**
 * Fixed storefront delivery charges.
 * Pathao’s price-plan quote is used only to classify the destination tier.
 */
export type DeliveryRegion = 'ISD' | 'SUBURB' | 'OSD'

export const WEBSITE_DELIVERY_RATES = {
  ISD: 80,
  SUBURB: 100,
  OSD: 150,
} as const satisfies Record<DeliveryRegion, number>

/** Standard weight for Pathao classification so fee bands stay stable. */
export const DELIVERY_REGION_PROBE_WEIGHT_KG = 0.5

/**
 * Pathao fee bands observed at 0.5kg from a Dhaka pickup store:
 * ISD ~60, Suburb ~80, OSD ~110+.
 */
export function classifyDeliveryRegion(pathaoFee: number): DeliveryRegion {
  const fee = Math.max(0, Number(pathaoFee) || 0)
  if (fee <= 70) return 'ISD'
  if (fee <= 95) return 'SUBURB'
  return 'OSD'
}

export function websiteDeliveryFromPathaoQuote(pathaoFee: number): {
  region: DeliveryRegion
  pathaoQuotedFee: number
  websiteFee: number
} {
  const pathaoQuotedFee = Math.max(0, Number(pathaoFee) || 0)
  const region = classifyDeliveryRegion(pathaoQuotedFee)
  return {
    region,
    pathaoQuotedFee,
    websiteFee: WEBSITE_DELIVERY_RATES[region],
  }
}
