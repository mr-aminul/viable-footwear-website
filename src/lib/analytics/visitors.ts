import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/db/admin'
import type { DateRangePreset } from '@/lib/orders/analytics-range'

const VISITOR_STATS_TAG = 'admin-visitor-stats'

/** Calendar date in Asia/Dhaka as YYYY-MM-DD. */
export function dhakaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

export type VisitorStats = {
  visitorsInRange: number
  visitorsToday: number
  days: DateRangePreset
}

async function fetchVisitorStats(days: DateRangePreset): Promise<VisitorStats> {
  const db = createServiceClient()
  const today = dhakaDateString()
  const from = addDaysIso(today, -(days - 1))

  const { count: visitorsInRange, error: rangeError } = await db
    .from('site_daily_visitors')
    .select('*', { count: 'exact', head: true })
    .gte('visit_date', from)
    .lte('visit_date', today)

  if (rangeError) {
    console.error('[visitors] range count', rangeError)
  }

  const { count: visitorsToday, error: todayError } = await db
    .from('site_daily_visitors')
    .select('*', { count: 'exact', head: true })
    .eq('visit_date', today)

  if (todayError) {
    console.error('[visitors] today count', todayError)
  }

  return {
    visitorsInRange: visitorsInRange ?? 0,
    visitorsToday: visitorsToday ?? 0,
    days,
  }
}

/** Cached visitor KPIs for the admin dashboard. */
export async function getVisitorStats(
  days: DateRangePreset = 7,
): Promise<VisitorStats> {
  return unstable_cache(
    () => fetchVisitorStats(days),
    ['admin-visitor-stats', String(days)],
    {
      revalidate: 60,
      tags: [VISITOR_STATS_TAG],
    },
  )()
}

const VISITOR_KEY_RE = /^[A-Za-z0-9_-]{8,80}$/

/** Persist a storefront visit (unique per visitor key per Dhaka day). */
export async function recordSiteVisit(visitorKey: string): Promise<boolean> {
  const key = visitorKey.trim()
  if (!VISITOR_KEY_RE.test(key)) return false

  const db = createServiceClient()
  const { error } = await db.rpc('record_site_visit', {
    p_visitor_key: key,
  })

  if (error) {
    console.error('[visitors] record', error)
    return false
  }
  return true
}
