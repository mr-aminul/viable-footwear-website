'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/catalog/types'
import { resolvePathaoConfig } from '@/lib/integrations/pathao-settings'
import {
  createPathaoOrder,
  getPathaoOrderInfo,
  normalizePathaoPhone,
} from '@/lib/pathao'
import type { OrderStatus } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

/** Map Pathao consignment status → our order_status. */
function mapPathaoStatusToOrderStatus(
  info: { order_status?: string; order_status_slug?: string },
): OrderStatus | null {
  const slug = (info.order_status_slug || '').toLowerCase()
  const label = (info.order_status || '').toLowerCase()
  const text = `${slug} ${label}`

  if (text.includes('deliver')) return 'delivered'
  if (text.includes('return')) return 'returned'
  if (text.includes('cancel')) return 'cancelled'
  if (
    text.includes('transit') ||
    text.includes('picked') ||
    text.includes('on_the_way') ||
    text.includes('on the way') ||
    text.includes('assigned')
  ) {
    return 'shipped'
  }
  if (text.includes('pending') || text.includes('pickup')) return 'shipped'
  return null
}

export async function dispatchOrderToPathao(
  orderId: string,
): Promise<ActionResult<{ consignmentId: string }>> {
  await requireRole(['admin', 'manager'])

  let parsedStoreId: number
  try {
    const config = await resolvePathaoConfig()
    parsedStoreId = Number.parseInt(config.storeId, 10)
    if (!Number.isFinite(parsedStoreId) || parsedStoreId <= 0) {
      return { ok: false, error: 'Pathao store ID is invalid.' }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }

  const supabase = await createClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_number, full_name, phone, secondary_phone, address, city_id, zone_id, area_id, city_name, zone_name, area_name, total, status, payment_method, pathao_consignment_id',
    )
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return { ok: false, error: 'Order not found.' }
  }

  if (order.pathao_consignment_id) {
    return { ok: false, error: 'Order already sent to Pathao.' }
  }

  if (order.status === 'cancelled') {
    return { ok: false, error: 'Cancelled orders cannot be sent to Pathao.' }
  }

  const recipientPhone = normalizePathaoPhone(order.phone ?? '')
  if (recipientPhone.length !== 11 || !recipientPhone.startsWith('01')) {
    return {
      ok: false,
      error: 'Order phone number is not valid for Pathao dispatch.',
    }
  }

  const secondaryPhoneNorm = order.secondary_phone
    ? normalizePathaoPhone(String(order.secondary_phone))
    : undefined

  const recipientAddress = [
    order.address ? String(order.address) : '',
    order.area_name ? String(order.area_name) : '',
    order.zone_name ? String(order.zone_name) : '',
    order.city_name ? String(order.city_name) : '',
  ]
    .filter(Boolean)
    .join(', ')

  if (recipientAddress.length < 10 || recipientAddress.length > 220) {
    return {
      ok: false,
      error: 'Address length must be between 10 and 220 characters for Pathao.',
    }
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('product_name, quantity, weight_kg')
    .eq('order_id', order.id)

  if (orderItemsError) {
    return { ok: false, error: 'Failed to load order items.' }
  }

  const itemsSummary = (orderItems ?? [])
    .map((item) => `${item.product_name} × ${item.quantity}`)
    .join(' | ')
  const totalWeight = Math.max(
    0.5,
    (orderItems ?? []).reduce(
      (sum, item) =>
        sum + Number(item.quantity ?? 0) * Number(item.weight_kg ?? 0.5),
      0,
    ),
  )

  const recipientName = String(order.full_name ?? '').trim()
  if (recipientName.length < 2) {
    return { ok: false, error: 'Order recipient name is missing or invalid.' }
  }

  const recipientCity = Number(order.city_id)
  const recipientZone = Number(order.zone_id)
  const recipientArea = Number(order.area_id)
  if (!Number.isFinite(recipientCity) || !Number.isFinite(recipientZone)) {
    return { ok: false, error: 'Order city/zone is missing or invalid.' }
  }

  try {
    const pathaoRes = await createPathaoOrder({
      store_id: parsedStoreId,
      merchant_order_id: String(order.order_number),
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      ...(secondaryPhoneNorm &&
      secondaryPhoneNorm.length === 11 &&
      secondaryPhoneNorm.startsWith('01')
        ? { recipient_secondary_phone: secondaryPhoneNorm }
        : {}),
      recipient_address: recipientAddress,
      recipient_city: recipientCity,
      recipient_zone: recipientZone,
      ...(order.area_id != null &&
      Number.isFinite(recipientArea) &&
      recipientArea !== 0
        ? { recipient_area: recipientArea }
        : {}),
      delivery_type: 48,
      item_type: 2,
      item_quantity: 1,
      item_weight: String(totalWeight),
      amount_to_collect:
        order.payment_method === 'cod'
          ? Math.round(Number(order.total) || 0)
          : 0,
      item_description:
        itemsSummary.length > 0 && itemsSummary.length <= 220
          ? itemsSummary
          : `Order ${order.order_number}`,
    })

    const consignmentId = pathaoRes.data?.consignment_id ?? null
    if (!consignmentId) {
      return { ok: false, error: 'Pathao did not return a consignment id.' }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pathao_consignment_id: consignmentId,
        pathao_error: null,
        status: 'shipped',
      })
      .eq('id', order.id)

    if (updateError) {
      return {
        ok: false,
        error: 'Pathao order created, but saving consignment failed.',
      }
    }

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${order.id}`)
    return { ok: true, data: { consignmentId } }
  } catch (error) {
    const pathaoError = error instanceof Error ? error.message : String(error)
    await supabase
      .from('orders')
      .update({ pathao_error: pathaoError })
      .eq('id', order.id)
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${order.id}`)
    return { ok: false, error: pathaoError }
  }
}

/**
 * Poll Pathao for the latest consignment status and update the order row.
 */
export async function syncPathaoOrderStatus(
  orderId: string,
): Promise<
  ActionResult<{ status: OrderStatus; pathaoLabel: string }>
> {
  await requireRole(['admin', 'manager'])

  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, pathao_consignment_id, status')
    .eq('id', orderId)
    .single()

  if (error || !order) return { ok: false, error: 'Order not found.' }
  if (!order.pathao_consignment_id) {
    return { ok: false, error: 'Order has no Pathao consignment yet.' }
  }

  try {
    const info = await getPathaoOrderInfo(order.pathao_consignment_id)
    const mapped = mapPathaoStatusToOrderStatus(info)
    const pathaoLabel =
      info.order_status || info.order_status_slug || 'Unknown'

    const nextStatus = mapped ?? order.status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        pathao_error: null,
        notes: `Pathao: ${pathaoLabel}`,
      })
      .eq('id', order.id)

    if (updateError) {
      return { ok: false, error: 'Could not save Pathao status.' }
    }

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${order.id}`)
    return {
      ok: true,
      data: { status: nextStatus, pathaoLabel },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from('orders')
      .update({ pathao_error: message })
      .eq('id', orderId)
    revalidatePath(`/admin/orders/${orderId}`)
    return { ok: false, error: message }
  }
}
