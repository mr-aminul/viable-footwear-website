/** Human labels for our storefront order_status enum. */
export function storeStatusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'New'
    case 'awaiting_fulfillment':
      return 'To dispatch'
    case 'pending_payment':
      return 'Awaiting payment'
    case 'paid':
      return 'Paid'
    case 'packed':
      return 'Packed'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
    case 'returned':
      return 'Returned'
    default:
      return status.replace(/_/g, ' ')
  }
}

/**
 * Pathao's own "Pending" means the consignment exists and is awaiting pickup —
 * not the same as a fresh website order waiting to be sent.
 */
export function pathaoStatusLabel(pathaoStatus: string | null | undefined): string {
  const raw = pathaoStatus?.trim()
  if (!raw) return 'Submitted'
  if (raw.toLowerCase() === 'pending') return 'Awaiting pickup'
  return raw
}

/** Locally cancelled but Pathao consignment may still be live. */
export function isPathaoShipmentStranded(order: {
  status: string
  pathao_consignment_id: string | null
  pathao_cancelled_at?: string | null
}): boolean {
  return (
    order.status === 'cancelled' &&
    Boolean(order.pathao_consignment_id) &&
    !order.pathao_cancelled_at
  )
}
