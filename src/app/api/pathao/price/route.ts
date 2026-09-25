import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { listActiveCampaignsForCheckout } from '@/lib/campaigns/queries'
import { pickCampaignDelivery } from '@/lib/campaigns/rules'
import { computeCodCheckoutTotals } from '@/lib/orders/cod-total'
import { computePrepaidCheckoutTotals } from '@/lib/payments/bkash'
import { getPathaoPrice } from '@/lib/pathao'
import {
  getActivePromoByCode,
  resolvePromoForCheckout,
} from '@/lib/promotions/queries'
import { createServiceClient } from '@/lib/supabase/admin'

type CartItemInput = {
  product_id?: string
  quantity?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      city_id?: number
      zone_id?: number
      item_weight?: number
      subtotal?: number
      promo_code?: string
      items?: CartItemInput[]
    }
    const { city_id, zone_id, item_weight, subtotal } = body
    if (city_id == null || zone_id == null) {
      return NextResponse.json(
        { success: false, error: 'city_id and zone_id are required' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }
    const result = await getPathaoPrice({
      recipient_city: Number(city_id),
      recipient_zone: Number(zone_id),
      item_weight: item_weight != null ? Number(item_weight) : undefined,
    })

    const pathaoDeliveryFee = Number(result.final_price) || 0
    let cartSubtotal = Math.max(0, Number(subtotal) || 0)

    // Prefer authoritative line prices when cart items are provided.
    const rawItems = Array.isArray(body.items) ? body.items : []
    const lines = rawItems
      .map((item) => ({
        productId: String(item.product_id ?? '').trim(),
        quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      }))
      .filter((item) => item.productId && item.quantity > 0)

    let promoDiscount = 0
    let promoPayload: {
      id: string
      title: string
      code: string
      discount: number
    } | null = null
    let promoError: string | null = null

    if (lines.length > 0) {
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

      cartSubtotal = pricedLines.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0,
      )

      const promoResult = await resolvePromoForCheckout({
        code: body.promo_code,
        lines: pricedLines,
      })
      if (!promoResult.ok) {
        promoError = promoResult.error
      } else if (promoResult.applied) {
        promoDiscount = promoResult.applied.discountAmount
        promoPayload = {
          id: promoResult.applied.promoId,
          title: promoResult.applied.title,
          code: promoResult.applied.code,
          discount: promoResult.applied.discountAmount,
        }
      }
    } else if (String(body.promo_code ?? '').trim()) {
      const promo = await getActivePromoByCode(String(body.promo_code))
      if (!promo) {
        promoError = 'This promo code is invalid or expired.'
      }
    }

    const goodsAfterPromo = Math.max(0, cartSubtotal - promoDiscount)
    const campaigns = await listActiveCampaignsForCheckout()
    const match = pickCampaignDelivery(campaigns, {
      subtotal: cartSubtotal,
      pathaoDeliveryFee,
      cityId: Number(city_id),
    })
    const deliveryAfterCampaign =
      match?.adjustedDeliveryFee ?? pathaoDeliveryFee
    const totals = computeCodCheckoutTotals(goodsAfterPromo, deliveryAfterCampaign)
    const prepaid = computePrepaidCheckoutTotals(
      goodsAfterPromo,
      deliveryAfterCampaign,
    )

    return NextResponse.json(
      {
        success: true,
        price: pathaoDeliveryFee,
        pathaoDeliveryFee,
        deliveryAfterCampaign,
        campaign: match
          ? {
              id: match.campaignId,
              name: match.campaignName,
              discount: match.discountAmount,
              ruleType: match.ruleType,
            }
          : null,
        promo: promoPayload,
        promoError,
        discountAmount: promoDiscount,
        goodsSubtotal: cartSubtotal,
        goodsAfterPromo,
        shipping: totals.shipping,
        total: totals.total,
        prepaidShipping: prepaid.shipping,
        prepaidTotal: prepaid.total,
        cod_enabled: result.cod_enabled,
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Pathao price]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
