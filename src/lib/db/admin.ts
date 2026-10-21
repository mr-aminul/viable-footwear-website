import { createServiceAuthApi } from '@/lib/db/service-auth'
import { createDbClient } from '@/lib/db/postgrest'

/**
 * Service client for server reads/writes against VPS Postgres (PostgREST).
 * Never import in client components — or only via server-only call sites.
 * Does not touch next/headers so shared settings modules can import it.
 */
export function createServiceClient() {
  if (
    !process.env.VIABLE_API_URL?.trim() ||
    !process.env.VIABLE_SERVICE_KEY?.trim()
  ) {
    throw new Error(
      'Missing Viable API configuration (VIABLE_API_URL / VIABLE_SERVICE_KEY)',
    )
  }
  return createDbClient(createServiceAuthApi())
}
