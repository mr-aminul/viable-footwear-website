import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/auth/session'
import { countUndispatchedOrders } from '@/lib/orders/queries'

/** Lightweight badge count for the admin sidebar (keeps layout off the critical path). */
export async function GET() {
  const session = await getStaffSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const count = await countUndispatchedOrders()
  return NextResponse.json(
    { count },
    {
      headers: {
        'Cache-Control': 'private, max-age=15',
      },
    },
  )
}
