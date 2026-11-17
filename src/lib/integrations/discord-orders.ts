import { formatPrice } from '@/lib/brand'
import type { ViableDbClient } from '@/lib/db/postgrest'

export type DiscordOrderItem = {
  name: string
  sizeEu?: number | null
  color?: string | null
  price: number
  quantity: number
}

export type DiscordOrderNotification = {
  orderId: string
  fullName: string
  email: string | null
  phone: string
  secondaryPhone?: string | null
  address: string
  cityName: string
  zoneName: string
  areaName: string
  paymentMethod: string
  /** Human label when order is not from website checkout. */
  channel?: string
  items: DiscordOrderItem[]
  subtotal: number
  discount?: number
  shipping: number
  total: number
}

const DISCORD_FIELD_MAX = 1024

function truncateField(text: string) {
  if (text.length <= DISCORD_FIELD_MAX) return text
  return `${text.slice(0, DISCORD_FIELD_MAX - 1)}…`
}

function formatDeliveryAddress(order: DiscordOrderNotification) {
  return [order.address, order.areaName, order.zoneName, order.cityName]
    .filter(Boolean)
    .join(', ')
}

function formatItemName(item: DiscordOrderItem) {
  const details = [
    item.sizeEu && Number(item.sizeEu) > 0 ? `EU ${item.sizeEu}` : null,
    item.color?.trim() || null,
  ].filter(Boolean)
  return details.length > 0 ? `${item.name} (${details.join(', ')})` : item.name
}

function formatItemsList(items: DiscordOrderItem[]) {
  const lines = items.map(
    (item) =>
      `• **${formatItemName(item)}** × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`,
  )
  return truncateField(lines.join('\n') || '—')
}

function paymentLabel(method: string) {
  if (method === 'cod') return 'Cash on delivery'
  if (method === 'bkash') return 'bKash'
  if (method === 'nagad') return 'Nagad'
  return method
}

function formatBreakdown(order: DiscordOrderNotification) {
  const discount = Number(order.discount) || 0
  const discountPart =
    discount > 0 ? ` · Discount −${formatPrice(discount)}` : ''
  return `Subtotal ${formatPrice(order.subtotal)}${discountPart} · Shipping ${formatPrice(order.shipping)} · **Total ${formatPrice(order.total)}**`
}

async function postDiscordWebhook(body: unknown): Promise<void> {
  const webhookUrl = process.env.DISCORD_ORDERS_WEBHOOK_URL?.trim()
  if (!webhookUrl) return

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[Discord] Order webhook failed:', response.status, text)
    }
  } catch (error) {
    console.error('[Discord] Order webhook error:', error)
  }
}

function buildOrderEmbed(order: DiscordOrderNotification) {
  const deliveryAddress = formatDeliveryAddress(order)
  const phoneLines = order.secondaryPhone
    ? `${order.phone}\nAlt: ${order.secondaryPhone}`
    : order.phone

  const fields = [
    { name: 'Customer', value: order.fullName || '—', inline: true },
    { name: 'Total', value: formatPrice(order.total), inline: true },
    { name: 'Payment', value: paymentLabel(order.paymentMethod), inline: true },
    ...(order.channel
      ? [{ name: 'Channel', value: order.channel, inline: true }]
      : []),
    { name: 'Email', value: order.email?.trim() || '—', inline: true },
    { name: 'Phone', value: phoneLines || '—', inline: true },
    {
      name: 'Items',
      value: formatItemsList(order.items),
      inline: false,
    },
    {
      name: 'Delivery',
      value: truncateField(deliveryAddress || '—'),
      inline: false,
    },
    {
      name: 'Breakdown',
      value: formatBreakdown(order),
      inline: false,
    },
  ]

  return {
    title: `New order ${order.orderId}`,
    color: 0x16a34a,
    timestamp: new Date().toISOString(),
    fields,
  }
}

/** Posts a new-order alert to Discord. Does not throw; logs failures. */
export async function notifyDiscordNewOrder(
  order: DiscordOrderNotification,
): Promise<void> {
  await postDiscordWebhook({ embeds: [buildOrderEmbed(order)] })
}

/**
 * One Discord message for a batch of imported / manual orders.
 * Lists every order in the same embed instead of spamming one webhook each.
 */
export async function notifyDiscordBulkOrders(
  orders: DiscordOrderNotification[],
): Promise<void> {
  if (orders.length === 0) return
  if (orders.length === 1) {
    await notifyDiscordNewOrder(orders[0]!)
    return
  }

  const totalGmv = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const lines = orders.map((order) => {
    const channel = order.channel ? ` · ${order.channel}` : ''
    const itemCount = order.items.reduce((n, item) => n + item.quantity, 0)
    return `• **${order.orderId}** — ${order.fullName || '—'} · ${formatPrice(order.total)} · ${paymentLabel(order.paymentMethod)}${channel} · ${itemCount} item${itemCount === 1 ? '' : 's'}`
  })

  const embed = {
    title: `${orders.length} orders added in bulk`,
    description: truncateField(lines.join('\n')),
    color: 0x1a3668,
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: 'Combined total',
        value: formatPrice(totalGmv),
        inline: true,
      },
      {
        name: 'Count',
        value: String(orders.length),
        inline: true,
      },
    ],
  }

  await postDiscordWebhook({ embeds: [embed] })
}

type ServiceClient = ViableDbClient

/** Loads a saved order and posts the Discord alert. Never throws. */
export async function notifyDiscordNewOrderById(
  db: ServiceClient,
  orderId: string,
): Promise<void> {
  try {
    const { data: order, error: orderError } = await db
      .from('orders')
      .select(
        'order_number, full_name, email, phone, secondary_phone, address, city_name, zone_name, area_name, payment_method, subtotal, discount_amount, shipping, total',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      console.error('[Discord] Could not load order for webhook', orderError)
      return
    }

    const { data: items, error: itemsError } = await db
      .from('order_items')
      .select('product_name, size_eu, color, unit_price, quantity')
      .eq('order_id', orderId)

    if (itemsError) {
      console.error('[Discord] Could not load order items for webhook', itemsError)
    }

    await notifyDiscordNewOrder({
      orderId: order.order_number,
      fullName: order.full_name,
      email: order.email,
      phone: order.phone,
      secondaryPhone: order.secondary_phone,
      address: order.address,
      cityName: order.city_name ?? '',
      zoneName: order.zone_name ?? '',
      areaName: order.area_name ?? '',
      paymentMethod: order.payment_method,
      items: (items ?? []).map((item) => ({
        name: item.product_name,
        sizeEu: item.size_eu,
        color: item.color,
        price: Number(item.unit_price),
        quantity: Number(item.quantity),
      })),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount_amount) || 0,
      shipping: Number(order.shipping),
      total: Number(order.total),
    })
  } catch (error) {
    console.error('[Discord] Order webhook error:', error)
  }
}
