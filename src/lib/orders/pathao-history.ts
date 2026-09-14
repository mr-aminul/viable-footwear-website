import type { PathaoHistoryEntry } from '@/lib/supabase/database.types'

/** Normalize jsonb pathao_history from the database. */
export function parsePathaoHistory(value: unknown): PathaoHistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is PathaoHistoryEntry => {
    if (!entry || typeof entry !== 'object') return false
    const row = entry as Record<string, unknown>
    return (
      typeof row.consignment_id === 'string' && row.consignment_id.length > 0
    )
  })
}
