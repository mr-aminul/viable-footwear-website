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
  city: 'Level -7, House 21, Sonargoan Janapath Road, Sector 13, Uttara, Dhaka.',
  mapsUrl: 'https://maps.app.goo.gl/43ytwZ55ebGantwu8?g_st=ac',
  /** Google Maps iframe embed (Share → Embed a map). */
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3650.0!2d90.3945!3d23.8743!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c5006fcf1ae7%3A0x8016cce6fecac1ae!2sViable!5e0!3m2!1sen!2sbd!4v1728320000000!5m2!1sen!2sbd',
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
