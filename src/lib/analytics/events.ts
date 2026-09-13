export type AnalyticsItem = {
  item_id: string
  item_name: string
  item_category?: string
  price: number
  quantity: number
  item_variant?: string
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    fbq?: (...args: unknown[]) => void
  }
}

function pushDataLayer(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}

function trackMeta(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  if (params) window.fbq('track', event, params)
  else window.fbq('track', event)
}

export function trackViewItem(item: AnalyticsItem) {
  pushDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'BDT',
      value: item.price * item.quantity,
      items: [item],
    },
  })
  trackMeta('ViewContent', {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: 'product',
    currency: 'BDT',
    value: item.price * item.quantity,
  })
}

export function trackAddToCart(item: AnalyticsItem) {
  pushDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'BDT',
      value: item.price * item.quantity,
      items: [item],
    },
  })
  trackMeta('AddToCart', {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: 'product',
    currency: 'BDT',
    value: item.price * item.quantity,
  })
}

export function trackBeginCheckout(input: {
  value: number
  items: AnalyticsItem[]
}) {
  pushDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'BDT',
      value: input.value,
      items: input.items,
    },
  })
  trackMeta('InitiateCheckout', {
    currency: 'BDT',
    value: input.value,
    num_items: input.items.reduce((sum, i) => sum + i.quantity, 0),
    content_ids: input.items.map((i) => i.item_id),
  })
}

export function trackPurchase(input: {
  transactionId: string
  value: number
  items?: AnalyticsItem[]
}) {
  pushDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: input.transactionId,
      currency: 'BDT',
      value: input.value,
      items: input.items ?? [],
    },
  })
  trackMeta('Purchase', {
    currency: 'BDT',
    value: input.value,
    content_ids: (input.items ?? []).map((i) => i.item_id),
  })
}
