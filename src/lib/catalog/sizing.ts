/**
 * Approximate EU → UK adults conversion used for the size-unit toggle.
 * Display-only; stock matching stays on EU sizes.
 */
const EU_TO_UK: Record<number, number> = {
  35: 2.5,
  36: 3.5,
  37: 4.5,
  38: 5,
  39: 5.5,
  40: 7,
  41: 7.5,
  42: 8,
  43: 9,
  44: 9.5,
  45: 10.5,
  46: 11.5,
  47: 12.5,
  48: 13.5,
}

export function euToUk(sizeEu: number): number | null {
  if (EU_TO_UK[sizeEu] != null) return EU_TO_UK[sizeEu]
  // Linear fallback for odd half sizes near the table
  const floor = Math.floor(sizeEu)
  const ceil = Math.ceil(sizeEu)
  if (floor !== ceil && EU_TO_UK[floor] != null && EU_TO_UK[ceil] != null) {
    const t = sizeEu - floor
    return EU_TO_UK[floor]! + (EU_TO_UK[ceil]! - EU_TO_UK[floor]!) * t
  }
  return null
}

export function formatSizeLabel(sizeEu: number, unit: 'EU' | 'UK'): string {
  if (unit === 'EU') return String(sizeEu)
  const uk = euToUk(sizeEu)
  return uk != null ? String(uk) : String(sizeEu)
}
