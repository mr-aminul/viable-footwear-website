import { cache } from 'react'
import { createAuthApi } from '@/lib/db/auth'
import { createDbClient } from '@/lib/db/postgrest'

/** Per-request DB client (cookie session for staff auth) via PostgREST. */
export const createClient = cache(async () => {
  return createDbClient(createAuthApi())
})
