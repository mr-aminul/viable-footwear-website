export type DateRangePreset = 1 | 7 | 30 | 90

export function rangePresetLabel(days: DateRangePreset): string {
  if (days === 1) return 'Today'
  return `Last ${days} days`
}
