import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { isNagadConfigured } from '@/lib/integrations/nagad-settings'

/** Public flag so checkout can show Nagad only when configured. */
export async function GET() {
  const configured = await isNagadConfigured()
  return NextResponse.json(
    { configured },
    { headers: NO_STORE_HEADERS },
  )
}
