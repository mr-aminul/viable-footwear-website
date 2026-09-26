import { NextRequest, NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'
import { revalidateAdminOrders } from '@/lib/orders/cache-tags'
import { listActiveCampaignsForCheckout } from '@/lib/campaigns/queries'
import { pickCampaignDelivery } from '@/lib/campaigns/rules'
import { resolvePromoForCheckout } from '@/lib/promotions/queries'
import { isBkashConfigured } from '@/lib/integrations/bkash-settings'
import { isNagadConfigured } from '@/lib/integrations/nagad-settings'
import {
  computeCodCheckoutTotals,
  isValidBdMobile,
  PATHAO_ADDRESS_MAX_LENGTH,
} from '@/lib/orders/cod-total'
import { generateOrderNumber } from '@/lib/orders/order-number'
import {
  computePrepaidCheckoutTotals,
  createBkashPayment,
} from '@/lib/payments/bkash'
import { createNagadPayment } from '@/lib/payments/nagad'
import {
  emitOmsWebhook,
  orderPayloadFromRow,
} from '@/lib/integrations/oms-webhook'
import { getPathaoPrice, normalizePathaoPhone } from '@/lib/pathao'
import { decrementOrderStock } from '@/lib/orders/stock'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'

type LineInput = {
  productId?: string
  variantId?: string
  quantity?: number
}

/**
 * Stock: COD decrements on place; bKash/Nagad decrement on successful payment.
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'orders', 10, 60_000)
  if (limited) return limited

  try {
    const body = (await request.json()) as {
      email?: string
      fullName?: string
      phone?: string
      secondaryPhone?: string
      address?: string
      city_id?: number
      zone_id?: number
      area_id?: number
      city_name?: string
      zone_name?: string
      area_name?: string
      payment_method?: 'cod' | 'bkash' | 'nagad'
      promo_code?: string
      items?: LineInput[]
    }

    const paymentMethod =
      body.payment_method === 'bkash'
        ? ('bkash' as const)
        : body.payment_method === 'nagad'
          ? ('nagad' as const)
          : ('cod' as const)

    const fullName = String(body.fullName ?? '').trim()
    const email = String(body.email ?? '').trim()
    const address = String(body.address ?? '').trim()
    const cityName = String(body.city_name ?? '').trim()
    const zoneName = String(body.zone_name ?? '').trim()
    const areaName = String(body.area_name ?? '').trim()
    const cityId = Number(body.city_id)
    const zoneId = Number(body.zone_id)
    const areaId =
      body.area_id != null && Number(body.area_id) > 0
        ? Number(body.area_id)
        : null

    if (fullName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter your full name.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }
    if (address.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Please enter a more detailed address.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }
    if (
      !Number.isFinite(cityId) ||
      !Number.isFinite(zoneId) ||
      !cityName ||
      !zoneName
    ) {
      return NextResponse.json(
        { success: false, error: 'Please select city and zone.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const phone = normalizePathaoPhone(String(body.phone ?? ''))
    if (!isValidBdMobile(phone)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Please enter a valid 11-digit Bangladesh mobile number (e.g. 01712345678).',
        },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const secondaryRaw = String(body.secondaryPhone ?? '').trim()
    const secondaryPhone = secondaryRaw
      ? normalizePathaoPhone(secondaryRaw)
      : null
    if (secondaryPhone && !isValidBdMobile(secondaryPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Secondary phone must be a valid 11-digit BD mobile number.',
        },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const combinedAddress = [address, areaName, zoneName, cityName]
      .filter(Boolean)
      .join(', ')
    if (combinedAddress.length > PATHAO_ADDRESS_MAX_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Delivery address is too long (${combinedAddress.length} characters). Keep it under ${PATHAO_ADDRESS_MAX_LENGTH}.`,
        },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Your bag is empty.' },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }

    const lines: Array<{ productId: string; variantId: string; quantity: number }> =
      []
    for (const item of rawItems) {
      const productId = String(item.productId ?? '').trim()
      const variantId = String(item.variantId ?? '').trim()
      const quantity = Number(item.quantity)
      if (!productId || !variantId || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid cart line.' },
          { status: 400, headers: NO_STORE_HEADERS },
        )
      }
      lines.push({ productId, variantId, quantity })
    }

    const supabase = createServiceClient()
    const variantIds = lines.map((l) => l.variantId)

    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select(
        'id, product_id, size_eu, color, sku, stock, price_override, active, products!inner(id, name, price, weight_kg, active)',
      )
      .in('id', variantIds)

    if (variantsError || !variants) {
      console.error('[orders] variant lookup', variantsError)
      return NextResponse.json(
        { success: false, error: 'Could not validate cart items.' },
        { status: 502, headers: NO_STORE_HEADERS },
      )
    }

    type VariantJoin = {
      id: string
      product_id: string
      size_eu: number
      color: string | null
      sku: string | null
      stock: number
      price_override: number | null
      active: boolean
      products:
        | {
            id: string
            name: string
            price: number
            weight_kg: number
            active: boolean
          }
        | {
            id: string
            name: string
            price: number
            weight_kg: number
            active: boolean
          }[]
    }

    const variantMap = new Map(
      (variants as unknown as VariantJoin[]).map((v) => [v.id, v]),
    )

    let subtotal = 0
    let totalWeight = 0
    const orderItemsPayload: Array<{
      product_id: string
      variant_id: string
      product_name: string
      size_eu: number
      color: string | null
      sku: string | null
      unit_price: number
      quantity: number
      weight_kg: number
    }> = []

    for (const line of lines) {
      const variant = variantMap.get(line.variantId)
      if (!variant || variant.product_id !== line.productId) {
        return NextResponse.json(
          { success: false, error: 'One or more items are no longer available.' },
          { status: 409, headers: NO_STORE_HEADERS },
        )
      }
      const product = Array.isArray(variant.products)
        ? variant.products[0]
        : variant.products
      if (!product || !product.active || !variant.active) {
        return NextResponse.json(
          {
            success: false,
            error: `${product?.name ?? 'A product'} is no longer available.`,
          },
          { status: 409, headers: NO_STORE_HEADERS },
        )
      }
      if (variant.stock < line.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Not enough stock for ${product.name} (EU ${variant.size_eu}).`,
          },
          { status: 409, headers: NO_STORE_HEADERS },
        )
      }

      const unitPrice = Number(variant.price_override ?? product.price)
      const weightKg = Math.max(0.1, Number(product.weight_kg) || 0.5)
      subtotal += unitPrice * line.quantity
      totalWeight += weightKg * line.quantity
      orderItemsPayload.push({
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        size_eu: Number(variant.size_eu),
        color: variant.color,
        sku: variant.sku,
        unit_price: unitPrice,
        quantity: line.quantity,
        weight_kg: weightKg,
      })
    }

    const itemWeight = Math.max(0.5, totalWeight)
    let pathaoDeliveryFee = 0
    try {
      const quote = await getPathaoPrice({
        recipient_city: cityId,
        recipient_zone: zoneId,
        item_weight: itemWeight,
      })
      pathaoDeliveryFee = Number(quote.final_price) || 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[orders] Pathao quote', message)
      return NextResponse.json(
        {
          success: false,
          error: 'Could not calculate delivery charge. Please try again.',
        },
        { status: 502, headers: NO_STORE_HEADERS },
      )
    }

    const promoResult = await resolvePromoForCheckout({
      code: body.promo_code,
      lines: orderItemsPayload.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    })
    if (!promoResult.ok) {
      return NextResponse.json(
        { success: false, error: promoResult.error },
        { status: 400, headers: NO_STORE_HEADERS },
      )
    }
    const promoApplied = promoResult.applied
    const discountAmount = promoApplied?.discountAmount ?? 0
    const goodsAfterPromo = Math.max(0, subtotal - discountAmount)

    const campaigns = await listActiveCampaignsForCheckout()
    const match = pickCampaignDelivery(campaigns, {
      subtotal,
      pathaoDeliveryFee,
      cityId,
    })
    const deliveryAfterCampaign =
      match?.adjustedDeliveryFee ?? pathaoDeliveryFee

    if (paymentMethod === 'bkash') {
      const ready = await isBkashConfigured()
      if (!ready) {
        return NextResponse.json(
          {
            success: false,
            error: 'bKash is not available yet. Please pay with Cash on Delivery.',
          },
          { status: 400, headers: NO_STORE_HEADERS },
        )
      }
    }

    if (paymentMethod === 'nagad') {
      const ready = await isNagadConfigured()
      if (!ready) {
        return NextResponse.json(
          {
            success: false,
            error: 'Nagad is not available yet. Please pay with Cash on Delivery.',
          },
          { status: 400, headers: NO_STORE_HEADERS },
        )
      }
    }

    const isPrepaid =
      paymentMethod === 'bkash' || paymentMethod === 'nagad'

    const { shipping, total } = isPrepaid
      ? computePrepaidCheckoutTotals(goodsAfterPromo, deliveryAfterCampaign)
      : computeCodCheckoutTotals(goodsAfterPromo, deliveryAfterCampaign)

    const orderNumber = generateOrderNumber()

    const { data: insertedOrder, error: orderInsertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        status: isPrepaid ? 'pending_payment' : 'awaiting_fulfillment',
        payment_method: paymentMethod,
        email: email || null,
        full_name: fullName,
        phone,
        secondary_phone: secondaryPhone,
        address,
        city_id: cityId,
        zone_id: zoneId,
        area_id: areaId,
        city_name: cityName,
        zone_name: zoneName,
        area_name: areaName,
        subtotal,
        shipping,
        total,
        pathao_delivery_fee: pathaoDeliveryFee,
        campaign_id: match?.campaignId ?? null,
        ...(promoApplied
          ? {
              promo_code_id: promoApplied.promoId,
              promo_code: promoApplied.code,
              discount_amount: discountAmount,
            }
          : discountAmount > 0
            ? { discount_amount: discountAmount }
            : {}),
      })
      .select('id, order_number')
      .single()

    if (orderInsertError || !insertedOrder) {
      console.error('[orders] insert', orderInsertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save order.' },
        { status: 502, headers: NO_STORE_HEADERS },
      )
    }

    const { error: itemsInsertError } = await supabase.from('order_items').insert(
      orderItemsPayload.map((item) => ({
        ...item,
        order_id: insertedOrder.id,
      })),
    )

    if (itemsInsertError) {
      console.error('[orders] items insert', itemsInsertError)
      await supabase.from('orders').delete().eq('id', insertedOrder.id)
      return NextResponse.json(
        { success: false, error: 'Failed to save order items.' },
        { status: 502, headers: NO_STORE_HEADERS },
      )
    }

    // COD: decrement on place. Gateways: decrement on successful payment.
    if (paymentMethod === 'cod') {
      const reserved = await decrementOrderStock(
        supabase,
        lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
        })),
      )

      if (!reserved.ok) {
        await supabase.from('order_items').delete().eq('order_id', insertedOrder.id)
        await supabase.from('orders').delete().eq('id', insertedOrder.id)
        return NextResponse.json(
          { success: false, error: reserved.error },
          { status: 409, headers: NO_STORE_HEADERS },
        )
      }

      revalidateAdminOrders()

      const omsOrder = orderPayloadFromRow({
        id: insertedOrder.id,
        order_number: insertedOrder.order_number,
        status: 'awaiting_fulfillment',
        payment_method: paymentMethod,
        total,
        full_name: fullName,
        phone,
        email: email || null,
        city_name: cityName,
        zone_name: zoneName,
        area_name: areaName,
        address,
      })
      // COD is not prepaid — only signal creation. Paid/collected is ops-side.
      void emitOmsWebhook('order.created', omsOrder)

      return NextResponse.json(
        {
          success: true,
          orderId: insertedOrder.order_number,
          paymentMethod,
          total,
          shipping,
          pathaoDeliveryFee,
        },
        { headers: NO_STORE_HEADERS },
      )
    }

    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'http://localhost:3000'

    if (paymentMethod === 'nagad') {
      try {
        const forwarded = request.headers.get('x-forwarded-for')
        const clientIp =
          forwarded?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          '103.100.200.100'
        const created = await createNagadPayment({
          amount: total,
          orderId: insertedOrder.order_number,
          clientIp,
          callbackURL: `${site}/api/payments/nagad/callback`,
          productDetails: { order: insertedOrder.order_number },
        })

        await supabase.from('payment_attempts').insert({
          order_id: insertedOrder.id,
          gateway: 'nagad',
          external_id: created.paymentRefId,
          status: 'created',
          amount: total,
          raw_json: created as unknown as Json,
        })

        void emitOmsWebhook(
          'order.created',
          orderPayloadFromRow({
            id: insertedOrder.id,
            order_number: insertedOrder.order_number,
            status: 'pending_payment',
            payment_method: paymentMethod,
            total,
            full_name: fullName,
            phone,
            email: email || null,
            city_name: cityName,
            zone_name: zoneName,
            area_name: areaName,
            address,
          }),
        )

        return NextResponse.json(
          {
            success: true,
            orderId: insertedOrder.order_number,
            paymentMethod,
            total,
            shipping,
            pathaoDeliveryFee,
            nagadURL: created.redirectUrl,
            paymentRefId: created.paymentRefId,
          },
          { headers: NO_STORE_HEADERS },
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[orders] nagad create', message)
        await supabase.from('orders').delete().eq('id', insertedOrder.id)
        return NextResponse.json(
          {
            success: false,
            error: message || 'Could not start Nagad payment. Try COD instead.',
          },
          { status: 502, headers: NO_STORE_HEADERS },
        )
      }
    }

    try {
      const created = await createBkashPayment({
        amount: total,
        merchantInvoiceNumber: insertedOrder.order_number,
        callbackURL: `${site}/api/payments/bkash/callback`,
        payerReference: phone,
      })

      await supabase.from('payment_attempts').insert({
        order_id: insertedOrder.id,
        gateway: 'bkash',
        external_id: created.paymentID ?? null,
        status: 'created',
        amount: total,
        raw_json: created as unknown as Json,
      })

      void emitOmsWebhook(
        'order.created',
        orderPayloadFromRow({
          id: insertedOrder.id,
          order_number: insertedOrder.order_number,
          status: 'pending_payment',
          payment_method: paymentMethod,
          total,
          full_name: fullName,
          phone,
          email: email || null,
          city_name: cityName,
          zone_name: zoneName,
          area_name: areaName,
          address,
        }),
      )

      return NextResponse.json(
        {
          success: true,
          orderId: insertedOrder.order_number,
          paymentMethod,
          total,
          shipping,
          pathaoDeliveryFee,
          bkashURL: created.bkashURL,
          paymentID: created.paymentID,
        },
        { headers: NO_STORE_HEADERS },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[orders] bkash create', message)
      await supabase.from('orders').delete().eq('id', insertedOrder.id)
      return NextResponse.json(
        {
          success: false,
          error: message || 'Could not start bKash payment. Try COD instead.',
        },
        { status: 502, headers: NO_STORE_HEADERS },
      )
    }
  } catch (error) {
    console.error('[orders]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to place order.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
