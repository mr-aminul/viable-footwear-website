export type PromoDiscountType = 'percent' | 'flat'

export type PromoCodeRow = {
  id: string
  title: string
  code: string
  description: string
  active: boolean
  starts_at: string | null
  ends_at: string | null
  discount_type: PromoDiscountType
  discount_value: number
  product_ids: string[]
}

export type PromoCartLine = {
  productId: string
  quantity: number
  unitPrice: number
}

export type PromoApplyResult = {
  promoId: string
  title: string
  code: string
  discountType: PromoDiscountType
  discountValue: number
  eligibleSubtotal: number
  discountAmount: number
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isPromoInDateWindow(
  now: Date,
  startsAt: string | null,
  endsAt: string | null,
): boolean {
  if (startsAt && new Date(startsAt) > now) return false
  if (endsAt && new Date(endsAt) < now) return false
  return true
}

export function discountTypeLabel(type: PromoDiscountType): string {
  return type === 'percent' ? 'Percent off' : 'Flat discount'
}

export function formatPromoDiscountValue(
  type: PromoDiscountType,
  value: number,
): string {
  if (type === 'percent') return `${value}%`
  return `৳${Math.round(value).toLocaleString('en-BD')}`
}

/**
 * Discount applies only to lines whose product is in the promo's product_ids.
 * Empty product_ids means the promo applies to the full cart (all products).
 */
export function computePromoDiscount(
  promo: Pick<
    PromoCodeRow,
    'id' | 'title' | 'code' | 'discount_type' | 'discount_value' | 'product_ids'
  >,
  lines: PromoCartLine[],
): PromoApplyResult | { error: string } {
  const scoped =
    promo.product_ids.length === 0
      ? lines
      : lines.filter((line) => promo.product_ids.includes(line.productId))

  if (scoped.length === 0) {
    return {
      error:
        'This promo does not apply to any products in your bag.',
    }
  }

  const eligibleSubtotal = scoped.reduce(
    (sum, line) => sum + Math.max(0, line.unitPrice) * Math.max(0, line.quantity),
    0,
  )

  if (eligibleSubtotal <= 0) {
    return { error: 'This promo cannot be applied to your bag.' }
  }

  let discountAmount = 0
  if (promo.discount_type === 'percent') {
    const pct = Math.min(100, Math.max(0, promo.discount_value))
    discountAmount = (eligibleSubtotal * pct) / 100
  } else {
    discountAmount = Math.min(promo.discount_value, eligibleSubtotal)
  }

  discountAmount = Math.round(discountAmount * 100) / 100
  if (discountAmount <= 0) {
    return { error: 'This promo cannot be applied to your bag.' }
  }

  return {
    promoId: promo.id,
    title: promo.title,
    code: promo.code,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    eligibleSubtotal,
    discountAmount,
  }
}

export function promoScheduleLabel(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt && !endsAt) return 'Always'
  const fmt = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`
  if (startsAt) return `From ${fmt(startsAt)}`
  return `Until ${fmt(endsAt!)}`
}
