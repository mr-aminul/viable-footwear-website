/**
 * Stable key for a colorway — color name, not hex swatch.
 */
export function colorwayKey(color: string | null | undefined): string {
  const name = color?.trim().toLowerCase()
  return name || 'default'
}
