import { cache } from 'react'
import { createAuthApi } from '@/lib/db/auth'
import { createDbClient } from '@/lib/db/postgrest'

/**
 * Per-request DB client (cookie session for staff auth).
 * Backed by VPS Postgres via PostgREST — no Supabase.
 */
export const createClient = cache(async () => {
  return createDbClient(createAuthApi())
})
