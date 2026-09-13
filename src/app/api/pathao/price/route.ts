import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { listActiveCampaignsForCheckout } from '@/lib/campaigns/queries'
import { pickCampaignDelivery } from '@/lib/campaigns/rules'
import { computeCodCheckoutTotals } from '@/lib/orders/cod-total'
import { computePrepaidCheckoutTotals } from '@/lib/payments/bkash'
import { getPathaoPrice } from '@/lib/pathao'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      city_id?: number
      zone_id?: number
      item_weight?: number
      subtotal?: number
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
    const cartSubtotal = Math.max(0, Number(subtotal) || 0)
    const campaigns = await listActiveCampaignsForCheckout()
    const match = pickCampaignDelivery(campaigns, {
      subtotal: cartSubtotal,
      pathaoDeliveryFee,
      cityId: Number(city_id),
    })
    const deliveryAfterCampaign =
      match?.adjustedDeliveryFee ?? pathaoDeliveryFee
    const totals = computeCodCheckoutTotals(cartSubtotal, deliveryAfterCampaign)
    const prepaid = computePrepaidCheckoutTotals(
      cartSubtotal,
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
