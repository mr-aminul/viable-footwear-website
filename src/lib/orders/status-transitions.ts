import type { OrderStatus } from '@/lib/supabase/database.types'

/**
 * Manual admin status graph (Pathao sync may still set shipped/delivered).
 * Terminal: cancelled, returned.
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['awaiting_fulfillment', 'pending_payment', 'paid', 'cancelled'],
  pending_payment: ['paid', 'awaiting_fulfillment', 'cancelled'],
  paid: ['awaiting_fulfillment', 'packed', 'cancelled'],
  awaiting_fulfillment: ['packed', 'shipped', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

export function allowedNextStatuses(
  current: OrderStatus,
): readonly OrderStatus[] {
  return ALLOWED[current] ?? []
}

export function canTransitionStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false
  return allowedNextStatuses(from).includes(to)
}

export const MANUAL_STATUS_OPTIONS: OrderStatus[] = [
  'pending_payment',
  'paid',
  'awaiting_fulfillment',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]
