/** Default brand values — overridden by Website → Site settings when saved. */
export const BRAND = {
  name: 'Viable',
  tagline: 'Everyday feet. Elevated.',
  phone: '01805-215181',
  whatsapp: '+8801805215181',
  email: 'viable.bd@gmail.com',
  instagram: 'https://www.instagram.com/viable.bd',
  facebook: 'https://www.facebook.com/viabledhaka',
  followers: '22K',
  recommend: '96%',
  city: 'Dhaka, Bangladesh',
} as const

/** Format BDT amounts with the ৳ symbol. */
export function formatPrice(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}

/**
 * Percent off from compare-at → current price.
 * Returns null when there is no meaningful discount.
 */
export function discountPercent(
  price: number,
  compareAt: number | null | undefined,
): number | null {
  if (compareAt == null || !Number.isFinite(compareAt) || !Number.isFinite(price)) {
    return null
  }
  if (compareAt <= 0 || price < 0 || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}

/** Digits-only id for wa.me links. */
export function whatsappDigits(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '')
}

export function whatsappHref(whatsapp: string, text?: string): string {
  const base = `https://wa.me/${whatsappDigits(whatsapp)}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}
