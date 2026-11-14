import { NextResponse } from 'next/server'
import { readVpsStatusReport } from '@/lib/status/read-report'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
}

/** Public VPS health snapshot for status.viable.fashion. */
export async function GET() {
  const report = await readVpsStatusReport()
  return NextResponse.json(report, { headers: NO_STORE })
}
