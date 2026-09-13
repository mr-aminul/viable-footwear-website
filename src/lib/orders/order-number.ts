/**
 * Human-readable order number, e.g. "VF-20260913-A1B2".
 */
export function generateOrderNumber(date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `VF-${dateStr}-${random}`
}
