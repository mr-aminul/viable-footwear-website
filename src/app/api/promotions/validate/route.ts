import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { resolvePromoForCheckout } from '@/lib/promotions/queries'
import { createServiceClient } from '@/lib/supabase/admin'

type CartItemInput = {
  product_id?: string
  quantity?: number
}

/**
 * Preview / validate a promo against cart lines (authoritative product prices).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      promo_code?: string
      items?: CartItemInput[]
    }

    const code = String(body.promo_code ?? '').trim()
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Enter a promo code.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    const lines = rawItems
      .map((item) => ({
        productId: String(item.product_id ?? '').trim(),
        quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      }))
      .filter((item) => item.productId && item.quantity > 0)

    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Your bag is empty.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const supabase = createServiceClient()
    const productIds = [...new Set(lines.map((l) => l.productId))]
    const { data: products } = await supabase
      .from('products')
      .select('id, price, active')
      .in('id', productIds)

    const priceById = new Map(
      (products ?? [])
        .filter((p) => p.active)
        .map((p) => [p.id, Number(p.price)]),
    )

    const pricedLines = lines
      .map((line) => {
        const unitPrice = priceById.get(line.productId)
        if (unitPrice == null) return null
        return {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice,
        }
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line))

    const result = await resolvePromoForCheckout({
      code,
      lines: pricedLines,
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    if (!result.applied) {
      return NextResponse.json(
        { success: false, error: 'This promo code is invalid or expired.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    return NextResponse.json(
      {
        success: true,
        promo: {
          id: result.applied.promoId,
          title: result.applied.title,
          code: result.applied.code,
          discount: result.applied.discountAmount,
        },
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[promotions validate]', message)
    return NextResponse.json(
      { success: false, error: 'Could not validate promo code.' },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
