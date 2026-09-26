import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { getPathaoCities } from '@/lib/pathao'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 'pathao-cities', 60, 60_000)
  if (limited) return limited

  try {
    const cities = await getPathaoCities()
    return NextResponse.json(
      { success: true, data: cities },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Pathao cities]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
