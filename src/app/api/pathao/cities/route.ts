import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { getPathaoCities } from '@/lib/pathao'

export async function GET() {
  try {
    const cities = await getPathaoCities()
    return NextResponse.json(
      { success: true, data: cities },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Pathao cities]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
