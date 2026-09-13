import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/auth/session'
import {
  listOrdersForCsvExport,
  ordersToCsv,
  parseRangePreset,
  resolveAnalyticsRange,
} from '@/lib/orders/analytics'

export async function GET(request: Request) {
  const session = await getStaffSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseRangePreset(searchParams.get('days') ?? undefined)
  const range = resolveAnalyticsRange(days)
  const rows = await listOrdersForCsvExport(range.fromIso, range.toIso)
  const csv = ordersToCsv(rows)

  const filename = `viable-orders-${range.from}_to_${range.to}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
