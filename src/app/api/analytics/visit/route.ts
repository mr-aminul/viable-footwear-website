import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { recordSiteVisit } from '@/lib/analytics/visitors'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * Lightweight storefront visit beacon. Counts unique visitors per Dhaka day.
 */
export async function POST(request: NextRequest) {
  // Client already sends at most once/day; keep a low ceiling for abuse.
  const limited = enforceRateLimit(request, 'site-visit', 8, 60_000)
  if (limited) return limited

  try {
    const body = (await request.json()) as { visitor_key?: string }
    const visitorKey = String(body.visitor_key ?? '').trim()
    if (!visitorKey) {
      return NextResponse.json(
        { success: false },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const ok = await recordSiteVisit(visitorKey)
    return NextResponse.json(
      { success: ok },
      { status: ok ? 200 : 400, headers: NO_STORE_HEADERS },
    )
  } catch {
    return NextResponse.json(
      { success: false },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
