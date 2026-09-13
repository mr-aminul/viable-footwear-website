/** Merchant Pathao tracking URL for a consignment + BD mobile. */
export function pathaoTrackingUrl(
  consignmentId: string,
  phone: string,
): string | null {
  const digits = phone.replace(/\D/g, '')
  const normalized =
    digits.length === 11 && digits.startsWith('01')
      ? digits
      : digits.length === 13 && digits.startsWith('8801')
        ? digits.slice(2)
        : digits
  if (!consignmentId || normalized.length !== 11) return null
  return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(consignmentId)}&phone=${encodeURIComponent(normalized)}`
}
