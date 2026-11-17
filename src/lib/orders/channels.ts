import type { OrderChannel } from '@/lib/db/database.types'

export const ORDER_CHANNELS: OrderChannel[] = [
  'website',
  'messenger',
  'whatsapp',
  'phone',
  'instagram',
  'walk_in',
  'other',
]

/** Social / chat channels shown as one “Online orders” stat. */
export const ONLINE_ORDER_CHANNELS: OrderChannel[] = [
  'messenger',
  'whatsapp',
  'instagram',
]

/** Channels managers typically use when adding offline / social orders. */
export const IMPORTABLE_ORDER_CHANNELS: OrderChannel[] = [
  'messenger',
  'whatsapp',
  'phone',
  'instagram',
  'walk_in',
  'other',
  'website',
]

/** In-store / counter sales — customer contact is phone only. */
export function isShopChannel(
  channel: OrderChannel | string | null | undefined,
): boolean {
  return channel === 'walk_in'
}

export function orderChannelLabel(channel: OrderChannel | string | null | undefined) {
  switch (channel) {
    case 'website':
      return 'Website'
    case 'messenger':
      return 'Messenger'
    case 'whatsapp':
      return 'WhatsApp'
    case 'phone':
      return 'Phone'
    case 'instagram':
      return 'Instagram'
    case 'walk_in':
      return 'Shop'
    case 'other':
      return 'Other'
    default:
      return 'Website'
  }
}

export function parseOrderChannel(raw: string | null | undefined): OrderChannel | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (!value) return null

  const aliases: Record<string, OrderChannel> = {
    website: 'website',
    web: 'website',
    storefront: 'website',
    messenger: 'messenger',
    fb: 'messenger',
    facebook: 'messenger',
    facebook_messenger: 'messenger',
    whatsapp: 'whatsapp',
    wa: 'whatsapp',
    phone: 'phone',
    call: 'phone',
    mobile: 'phone',
    instagram: 'instagram',
    ig: 'instagram',
    walk_in: 'walk_in',
    walkin: 'walk_in',
    shop: 'walk_in',
    other: 'other',
  }

  return aliases[value] ?? null
}
