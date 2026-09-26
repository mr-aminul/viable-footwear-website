import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { getPathaoAreas } from '@/lib/pathao'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, 'pathao-areas', 60, 60_000)
  if (limited) return limited

  const zoneId = request.nextUrl.searchParams.get('zone_id')
  if (!zoneId) {
    return NextResponse.json(
      { success: false, error: 'zone_id is required' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }
  const id = parseInt(zoneId, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid zone_id' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }
  try {
    const areas = await getPathaoAreas(id)
    return NextResponse.json(
      { success: true, data: areas },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Pathao areas]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
