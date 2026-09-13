import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { isBkashConfigured } from '@/lib/integrations/bkash-settings'

/** Public flag so checkout can show bKash only when configured. */
export async function GET() {
  const configured = await isBkashConfigured()
  return NextResponse.json(
    { configured },
    { headers: NO_STORE_HEADERS },
  )
}
