'use server'

import { requireRole } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/catalog/types'
import { resolvePathaoConfig } from '@/lib/integrations/pathao-settings'
import {
  emitOmsWebhook,
  orderPayloadFromRow,
} from '@/lib/integrations/oms-webhook'
import {
  cancelPathaoOrder,
  createPathaoOrder,
  getPathaoOrderInfo,
  normalizePathaoPhone,
} from '@/lib/pathao'
import type { OrderStatus } from '@/lib/supabase/database.types'
import { revalidateAdminOrders } from '@/lib/orders/cache-tags'
import { isPathaoShipmentStranded } from '@/lib/orders/status-labels'
import { parsePathaoHistory } from '@/lib/orders/pathao-history'
import {
  orderHeldStock,
  restoreOrderStock,
} from '@/lib/orders/stock'
import { createClient } from '@/lib/supabase/server'

async function assertPathaoConfigured(): Promise<ActionResult | null> {
  try {
    await resolvePathaoConfig()
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

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

    const pathaoStatus = pathaoRes.data?.order_status?.trim() || null

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pathao_consignment_id: consignmentId,
        pathao_status: pathaoStatus,
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

    revalidateAdminOrders(order.id)
    void emitOmsWebhook(
      'order.shipped',
      orderPayloadFromRow({
        id: order.id,
        order_number: order.order_number,
        status: 'shipped',
        payment_method: order.payment_method,
        total: Number(order.total),
        full_name: order.full_name,
        phone: order.phone,
        email: null,
        city_name: order.city_name,
        zone_name: order.zone_name,
        area_name: order.area_name,
        address: order.address,
        pathao_consignment_id: consignmentId,
      }),
    )
    return { ok: true, data: { consignmentId } }
  } catch (error) {
    const pathaoError = error instanceof Error ? error.message : String(error)
    await supabase
      .from('orders')
      .update({ pathao_error: pathaoError })
      .eq('id', order.id)
    revalidateAdminOrders(order.id)
    return { ok: false, error: pathaoError }
  }
}

const BULK_ORDER_ACTION_LIMIT = 50

type BulkOrderFailure = {
  orderId: string
  orderNumber: string | null
  error: string
}

type BulkOrderActionResult = {
  okCount: number
  failCount: number
  failures: BulkOrderFailure[]
}

async function runBulkOrderAction(
  orderIds: string[],
  runOne: (orderId: string) => Promise<ActionResult<unknown>>,
): Promise<ActionResult<BulkOrderActionResult>> {
  await requireRole(['admin', 'manager'])

  const uniqueIds = [
    ...new Set(orderIds.map((id) => id.trim()).filter(Boolean)),
  ]
  if (uniqueIds.length === 0) {
    return { ok: false, error: 'No orders selected.' }
  }
  if (uniqueIds.length > BULK_ORDER_ACTION_LIMIT) {
    return {
      ok: false,
      error: `Select at most ${BULK_ORDER_ACTION_LIMIT} orders at a time.`,
    }
  }

  const supabase = await createClient()
  const { data: orderRows } = await supabase
    .from('orders')
    .select('id, order_number')
    .in('id', uniqueIds)
  const orderNumberById = new Map(
    (orderRows ?? []).map((row) => [row.id, row.order_number]),
  )

  const failures: BulkOrderFailure[] = []
  let okCount = 0

  for (const orderId of uniqueIds) {
    const result = await runOne(orderId)
    if (result.ok) {
      okCount += 1
      continue
    }
    failures.push({
      orderId,
      orderNumber: orderNumberById.get(orderId) ?? null,
      error: result.error,
    })
  }

  revalidateAdminOrders()

  return {
    ok: true,
    data: {
      okCount,
      failCount: failures.length,
      failures,
    },
  }
}

/**
 * Dispatch many orders to Pathao sequentially. Continues after individual failures.
 */
export async function dispatchOrdersToPathao(
  orderIds: string[],
): Promise<ActionResult<BulkOrderActionResult>> {
  return runBulkOrderAction(orderIds, dispatchOrderToPathao)
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
    .select(
      'id, order_number, status, payment_method, total, full_name, phone, email, city_name, zone_name, area_name, address, pathao_consignment_id',
    )
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
        pathao_status: pathaoLabel,
        pathao_error: null,
        ...(nextStatus === 'cancelled'
          ? { pathao_cancelled_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', order.id)

    if (updateError) {
      return { ok: false, error: 'Could not save Pathao status.' }
    }

    revalidateAdminOrders(order.id)
    if (nextStatus === 'delivered' && order.status !== 'delivered') {
      void emitOmsWebhook(
        'order.delivered',
        orderPayloadFromRow({ ...order, status: 'delivered' }),
      )
    }
    if (nextStatus === 'shipped' && order.status !== 'shipped') {
      void emitOmsWebhook(
        'order.shipped',
        orderPayloadFromRow({ ...order, status: 'shipped' }),
      )
    }
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
    revalidateAdminOrders(orderId)
    return { ok: false, error: message }
  }
}

/**
 * Cancel an order locally and, when present, revoke the Pathao consignment.
 * Also used to retry Pathao cancel for stranded locally-cancelled orders.
 */
export async function cancelOrder(
  orderId: string,
): Promise<ActionResult<{ pathaoCancelled: boolean; message: string }>> {
  await requireRole(['admin', 'manager'])

  const supabase = await createClient()
  const { data: existing, error } = await supabase
    .from('orders')
    .select(
      'id, status, pathao_consignment_id, pathao_cancelled_at, payment_method, payment_trx_id',
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error || !existing) return { ok: false, error: 'Order not found.' }

  const alreadyCancelled = existing.status === 'cancelled'
  const consignmentId = existing.pathao_consignment_id?.trim() || null
  const shouldRestoreStock =
    !alreadyCancelled && orderHeldStock(existing)

  if (alreadyCancelled && !consignmentId) {
    return { ok: false, error: 'Order is already cancelled.' }
  }

  if (
    alreadyCancelled &&
    consignmentId &&
    existing.pathao_cancelled_at
  ) {
    return { ok: false, error: 'Order and Pathao shipment are already cancelled.' }
  }

  let pathaoCancelled = false
  let pathaoAlreadyCancelled = false

  if (consignmentId) {
    const configError = await assertPathaoConfigured()
    if (configError) return configError

    try {
      const result = await cancelPathaoOrder(consignmentId)
      pathaoCancelled = true
      pathaoAlreadyCancelled = result.alreadyCancelled
    } catch (err) {
      const pathaoError = err instanceof Error ? err.message : String(err)
      await supabase
        .from('orders')
        .update({ pathao_error: pathaoError })
        .eq('id', orderId)
      revalidateAdminOrders(orderId)
      return { ok: false, error: pathaoError }
    }
  }

  const { data: cancelledRow, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      pathao_error: null,
      ...(pathaoCancelled
        ? {
            pathao_cancelled_at: new Date().toISOString(),
            pathao_status: pathaoAlreadyCancelled
              ? 'Already cancelled'
              : 'Cancelled',
          }
        : {}),
    })
    .eq('id', orderId)
    .neq('status', 'cancelled')
    .select('id')
    .maybeSingle()

  if (updateError) {
    return { ok: false, error: 'Failed to cancel order.' }
  }

  // Only restore when we actually flipped this row to cancelled (avoids double restore).
  if (shouldRestoreStock && cancelledRow) {
    const restored = await restoreOrderStock(supabase, orderId)
    if (!restored.ok) {
      return {
        ok: false,
        error: `Order cancelled, but stock restore failed: ${restored.error}`,
      }
    }
  }

  const message = pathaoCancelled
    ? pathaoAlreadyCancelled
      ? 'Order cancelled. The Pathao shipment was already cancelled.'
      : `Order cancelled and Pathao shipment ${consignmentId} cancelled.`
    : shouldRestoreStock && cancelledRow
      ? 'Order cancelled and stock restored.'
      : 'Order cancelled.'

  revalidateAdminOrders(orderId)
  return { ok: true, data: { pathaoCancelled, message } }
}

/**
 * Permanently delete an order. Cancels the Pathao consignment first when present.
 */
export async function deleteOrder(
  orderId: string,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])

  const supabase = await createClient()
  const { data: existing, error } = await supabase
    .from('orders')
    .select('id, pathao_consignment_id')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !existing) return { ok: false, error: 'Order not found.' }

  const consignmentId = existing.pathao_consignment_id?.trim() || null

  if (consignmentId) {
    const configError = await assertPathaoConfigured()
    if (configError) return configError

    try {
      await cancelPathaoOrder(consignmentId)
    } catch (err) {
      const pathaoError = err instanceof Error ? err.message : String(err)
      await supabase
        .from('orders')
        .update({ pathao_error: pathaoError })
        .eq('id', orderId)
      revalidateAdminOrders(orderId)
      return { ok: false, error: pathaoError }
    }
  }

  // order_items cascade via FK, but delete explicitly for clarity
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (itemsError) {
    return { ok: false, error: 'Failed to delete order items.' }
  }

  const { error: deleteError } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)

  if (deleteError) {
    return { ok: false, error: 'Failed to delete order.' }
  }

  revalidateAdminOrders()
  return { ok: true }
}

/**
 * Cancel many orders sequentially. Continues after individual failures.
 */
export async function cancelOrders(
  orderIds: string[],
): Promise<ActionResult<BulkOrderActionResult>> {
  return runBulkOrderAction(orderIds, cancelOrder)
}

/**
 * Delete many orders sequentially. Continues after individual failures.
 */
export async function deleteOrders(
  orderIds: string[],
): Promise<ActionResult<BulkOrderActionResult>> {
  return runBulkOrderAction(orderIds, deleteOrder)
}

/**
 * Reopen a cancelled order for Pathao again on the same row.
 * Archives any previous consignment into pathao_history first.
 */
export async function reactivateOrderForResend(
  orderId: string,
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  await requireRole(['admin', 'manager'])

  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, pathao_consignment_id, pathao_status, pathao_error, pathao_cancelled_at, pathao_history',
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) return { ok: false, error: 'Order not found.' }

  if (order.status !== 'cancelled') {
    return {
      ok: false,
      error: 'Only cancelled orders can be reopened for Pathao resend.',
    }
  }

  if (
    isPathaoShipmentStranded({
      status: order.status,
      pathao_consignment_id: order.pathao_consignment_id,
      pathao_cancelled_at: order.pathao_cancelled_at,
    })
  ) {
    return {
      ok: false,
      error:
        'Cancel the Pathao shipment first, then use Resend to reopen this order.',
    }
  }

  const history = parsePathaoHistory(order.pathao_history)
  const consignmentId = order.pathao_consignment_id?.trim() || null
  if (consignmentId) {
    history.push({
      consignment_id: consignmentId,
      status: order.pathao_status,
      error: order.pathao_error,
      cancelled_at: order.pathao_cancelled_at,
      archived_at: new Date().toISOString(),
    })
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'awaiting_fulfillment',
      pathao_consignment_id: null,
      pathao_status: null,
      pathao_error: null,
      pathao_cancelled_at: null,
      pathao_history: history,
    })
    .eq('id', orderId)

  if (updateError) {
    return { ok: false, error: 'Failed to reopen order for resend.' }
  }

  revalidateAdminOrders(orderId)
  return {
    ok: true,
    data: { orderId: order.id, orderNumber: order.order_number },
  }
}
