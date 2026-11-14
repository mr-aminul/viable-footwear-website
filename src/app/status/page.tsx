import type { Metadata } from 'next'
import { StatusPage } from '@/components/status/StatusPage'
import { readVpsStatusReport } from '@/lib/status/read-report'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Status',
  description:
    'A simple live check of Viable websites and the server behind them.',
  robots: { index: true, follow: true },
}

export default async function StatusRoutePage() {
  const report = await readVpsStatusReport()
  return <StatusPage initial={report} />
}
