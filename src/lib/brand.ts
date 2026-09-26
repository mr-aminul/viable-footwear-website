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

/** Digits-only id for wa.me links. */
export function whatsappDigits(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '')
}

export function whatsappHref(whatsapp: string, text?: string): string {
  const base = `https://wa.me/${whatsappDigits(whatsapp)}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}
