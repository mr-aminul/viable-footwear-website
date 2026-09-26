/**
 * Compare gateway-reported amount to the stored payment attempt amount.
 * Amounts are in BDT; allow 0.01 tolerance for string/float rounding.
 */
export function amountsMatch(
  expected: number | string | null | undefined,
  actual: number | string | null | undefined,
  tolerance = 0.01,
): boolean {
  const a = Number(expected)
  const b = Number(actual)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(a - b) <= tolerance
}
