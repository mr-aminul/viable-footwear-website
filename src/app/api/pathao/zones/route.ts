import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { getPathaoZones } from '@/lib/pathao'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, 'pathao-zones', 60, 60_000)
  if (limited) return limited

  const cityId = request.nextUrl.searchParams.get('city_id')
  if (!cityId) {
    return NextResponse.json(
      { success: false, error: 'city_id is required' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }
  const id = parseInt(cityId, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid city_id' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }
  try {
    const zones = await getPathaoZones(id)
    return NextResponse.json(
      { success: true, data: zones },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Pathao zones]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
