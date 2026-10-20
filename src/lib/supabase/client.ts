/**
 * Browser Supabase client removed — storefront does not use client-side DB auth.
 * Kept as a stub so accidental imports fail clearly.
 */
export function createClient(): never {
  throw new Error(
    'Browser database client is not available. Use server actions / route handlers.',
  )
}
