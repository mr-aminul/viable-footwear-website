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
