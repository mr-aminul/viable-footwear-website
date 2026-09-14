import { revalidatePath, revalidateTag } from 'next/cache'

/** Sidebar badge + short-lived admin order aggregates. */
export const ADMIN_ORDERS_BADGE_TAG = 'admin-orders-badge'

/**
 * Refresh order list/detail pages and the undispatched badge cache.
 * Avoids `revalidatePath('/admin', 'layout')` so the admin shell stays warm.
 */
export function revalidateAdminOrders(orderId?: string) {
  revalidateTag(ADMIN_ORDERS_BADGE_TAG)
  revalidatePath('/admin')
  revalidatePath('/admin/orders')
  revalidatePath('/admin/analytics')
  if (orderId) revalidatePath(`/admin/orders/${orderId}`)
}
