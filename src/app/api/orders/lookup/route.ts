import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { normalizePathaoPhone } from '@/lib/pathao'
import { createServiceClient } from '@/lib/supabase/admin'

/**
 * Guest lookup: order number + phone → current status / Pathao consignment.
 * Lets “Your Orders” refresh tracking after Admin dispatches to Pathao.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orderId?: string
      phone?: string
    }
    const orderId = String(body.orderId ?? '').trim()
    const phone = normalizePathaoPhone(String(body.phone ?? ''))

    if (!orderId || phone.length !== 11 || !phone.startsWith('01')) {
      return NextResponse.json(
        { success: false, error: 'Order number and phone are required.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const supabase = createServiceClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'order_number, phone, status, pathao_consignment_id, total',
      )
      .eq('order_number', orderId)
      .eq('phone', phone)
      .maybeSingle()

    if (error) {
      console.error('[orders/lookup]', error)
      return NextResponse.json(
        { success: false, error: 'Could not look up order.' },
        { status: 502, headers: NO_STORE_HEADERS },
      )
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found for this phone number.' },
        { status: 404, headers: NO_STORE_HEADERS },
      )
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.order_number,
        status: order.status,
        pathaoConsignmentId: order.pathao_consignment_id,
        total: Number(order.total),
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[orders/lookup]', error)
    return NextResponse.json(
      { success: false, error: 'Lookup failed.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
