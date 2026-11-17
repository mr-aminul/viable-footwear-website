import type { ActionResult } from '@/lib/catalog/types'
import type {
  OrderChannel,
  PaymentMethod,
} from '@/lib/db/database.types'
import type { ViableDbClient } from '@/lib/db/postgrest'
import {
  DELIVERY_REGION_PROBE_WEIGHT_KG,
  WEBSITE_DELIVERY_RATES,
  websiteDeliveryFromPathaoQuote,
} from '@/lib/orders/delivery-rates'
import {
  computeCodCheckoutTotals,
  isValidBdMobile,
  PATHAO_ADDRESS_MAX_LENGTH,
} from '@/lib/orders/cod-total'
import { generateOrderNumber } from '@/lib/orders/order-number'
import { isPreorderLine } from '@/lib/orders/preorder'
import { decrementOrderStock } from '@/lib/orders/stock'
import { isShopChannel, parseOrderChannel } from '@/lib/orders/channels'
import {
  parseOrderItemsText,
  type BulkOrderLineInput,
} from '@/lib/orders/import-csv'
import {
  parseVariantIdToken,
  pickBestVariantMatch,
  type ResolveProductHint,
  type ResolveVariantCandidate,
} from '@/lib/orders/import-resolve'
import type {
  BulkOrderRowInput,
  BulkOrderRowResult,
} from '@/lib/orders/import-types'
import {
  getPathaoCities,
  getPathaoPrice,
  getPathaoZones,
  normalizePathaoPhone,
  type PathaoCity,
} from '@/lib/pathao'

type ResolvedLine = {
  product_id: string
  variant_id: string
  product_name: string
  size_eu: number
  color: string | null
  sku: string | null
  unit_price: number
  quantity: number
  weight_kg: number
  is_preorder: boolean
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
        slug: string
        price: number
        weight_kg: number
        active: boolean
        preorder_enabled: boolean
      }
    | {
        id: string
        name: string
        slug: string
        price: number
        weight_kg: number
        active: boolean
        preorder_enabled: boolean
      }[]
}

function productFromJoin(variant: VariantJoin) {
  return Array.isArray(variant.products)
    ? variant.products[0]
    : variant.products
}

function parsePaymentMethod(raw: string | null | undefined): PaymentMethod {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === 'bkash' || value === 'bKash') return 'bkash'
  if (value === 'nagad') return 'nagad'
  return 'cod'
}

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'y'
}

async function resolveVariantById(
  db: ViableDbClient,
  variantId: string,
  quantity: number,
): Promise<ResolvedLine | { error: string }> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Quantity must be a whole number of 1 or more.' }
  }

  const id = variantId.trim()
  if (!id) {
    return { error: 'Each picker line needs a variant.' }
  }

  const { data, error } = await db
    .from('product_variants')
    .select(
      'id, product_id, size_eu, color, sku, stock, price_override, active, products!inner(id, name, slug, price, weight_kg, active, preorder_enabled)',
    )
    .eq('id', id)
    .eq('active', true)
    .limit(1)

  if (error) {
    console.error('[orders import] variant id lookup', error)
    return { error: 'Could not look up the selected variant.' }
  }

  const match = ((data ?? []) as unknown as VariantJoin[])[0]
  if (!match) {
    return { error: 'Selected variant is missing or inactive. Pick again.' }
  }

  return toResolvedLine(match, quantity)
}

async function resolveVariantForLine(
  db: ViableDbClient,
  line: BulkOrderLineInput,
): Promise<ResolvedLine | { error: string }> {
  const quantity = line.quantity
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Quantity must be a whole number of 1 or more.' }
  }

  const variantId =
    line.variantId?.trim() || parseVariantIdToken(line.sku ?? '')
  if (variantId) {
    return resolveVariantById(db, variantId, quantity)
  }

  const sku = line.sku?.trim()
  if (sku) {
    const { data, error } = await db
      .from('product_variants')
      .select(
        'id, product_id, size_eu, color, sku, stock, price_override, active, products!inner(id, name, slug, price, weight_kg, active, preorder_enabled)',
      )
      .ilike('sku', sku)
      .eq('active', true)
      .limit(5)

    if (error) {
      console.error('[orders import] sku lookup', error)
      return { error: `Could not look up SKU "${sku}".` }
    }

    const matches = (data ?? []) as unknown as VariantJoin[]
    if (matches.length === 0) {
      return { error: `No active variant with SKU "${sku}".` }
    }
    if (matches.length > 1) {
      return {
        error: `SKU "${sku}" matches more than one variant — make SKUs unique.`,
      }
    }

    return toResolvedLine(matches[0]!, quantity)
  }

  const productKey = line.product?.trim()
  if (!productKey) {
    return { error: 'Each item needs a SKU or product name.' }
  }

  const sizeEu = Number(line.sizeEu)
  if (!Number.isFinite(sizeEu) || sizeEu <= 0) {
    return { error: `Add an EU size for "${productKey}".` }
  }

  const color = (line.color ?? '').trim()
  if (!color) {
    return { error: `Add a color for "${productKey}".` }
  }

  // Gather every plausible product (same name ignoring case, or matching slug).
  // Scoring then picks the only sensible size/color — no silent wrong shoe.
  const keyLower = productKey.toLowerCase()
  const [{ data: byName }, { data: bySlug }] = await Promise.all([
    db
      .from('products')
      .select('id, name, slug')
      .eq('active', true)
      .ilike('name', productKey)
      .limit(20),
    db
      .from('products')
      .select('id, name, slug')
      .eq('active', true)
      .eq('slug', keyLower)
      .limit(5),
  ])

  const productsById = new Map<string, ResolveProductHint>()
  for (const row of byName ?? []) {
    if (row.name.trim().toLowerCase() === keyLower) {
      productsById.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
      })
    }
  }
  for (const row of bySlug ?? []) {
    productsById.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
    })
  }

  // Also pull near-name siblings (Purechill PR, etc.) only when the key is a
  // prefix of the catalog name — still scored, so weak matches lose.
  if (productsById.size === 0) {
    const { data: fuzzy } = await db
      .from('products')
      .select('id, name, slug')
      .eq('active', true)
      .ilike('name', `%${productKey}%`)
      .limit(12)
    for (const row of fuzzy ?? []) {
      productsById.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
      })
    }
  }

  const products = [...productsById.values()]
  if (products.length === 0) {
    return {
      error: `No product named "${productKey}". Use the catalog name, slug, or a SKU.`,
    }
  }

  const productIds = products.map((p) => p.id)
  const { data: variants, error: variantError } = await db
    .from('product_variants')
    .select(
      'id, product_id, size_eu, color, sku, stock, price_override, active, products!inner(id, name, slug, price, weight_kg, active, preorder_enabled)',
    )
    .in('product_id', productIds)
    .eq('active', true)
    .eq('size_eu', sizeEu)
    .limit(40)

  if (variantError) {
    console.error('[orders import] variant lookup', variantError)
    return { error: `Could not look up size/color for "${productKey}".` }
  }

  const variantRows = (variants ?? []) as unknown as VariantJoin[]
  const candidates: ResolveVariantCandidate[] = variantRows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    size_eu: Number(row.size_eu),
    color: row.color,
    sku: row.sku,
  }))

  const picked = pickBestVariantMatch({
    productKey,
    sizeEu,
    color,
    products,
    variants: candidates,
  })

  if (!picked.ok && picked.reason === 'none') {
    return {
      error: `No match for "${productKey}" · EU ${sizeEu} · ${color}. Check size and color.`,
    }
  }
  if (!picked.ok) {
    return {
      error: `Several variants match "${productKey}" · EU ${sizeEu} · ${color}. Use a SKU.`,
    }
  }

  const winner = variantRows.find((row) => row.id === picked.variant.id)
  if (!winner) {
    return {
      error: `No match for "${productKey}" · EU ${sizeEu} · ${color}. Check size and color.`,
    }
  }

  return toResolvedLine(winner, quantity)
}

function toResolvedLine(
  variant: VariantJoin,
  quantity: number,
): ResolvedLine | { error: string } {
  const product = productFromJoin(variant)
  if (!product || !product.active || !variant.active) {
    return {
      error: `${product?.name ?? 'Product'} is not available.`,
    }
  }

  const lineIsPreorder = isPreorderLine({
    stock: variant.stock,
    quantity,
    preorderEnabled: product.preorder_enabled,
  })

  if (variant.stock < quantity && !lineIsPreorder) {
    const sizeHint =
      Number(variant.size_eu) > 0 ? ` (EU ${variant.size_eu})` : ''
    return {
      error: `Not enough stock for ${product.name}${sizeHint}.`,
    }
  }

  return {
    product_id: product.id,
    variant_id: variant.id,
    product_name: product.name,
    size_eu: Number(variant.size_eu),
    color: variant.color,
    sku: variant.sku,
    unit_price: Number(variant.price_override ?? product.price),
    quantity,
    weight_kg: Math.max(0.1, Number(product.weight_kg) || 0.5),
    is_preorder: lineIsPreorder,
  }
}

async function resolvePathaoLocation(input: {
  cityName: string
  zoneName: string
  areaName: string
  cityId?: number | null
  zoneId?: number | null
  areaId?: number | null
  citiesCache?: PathaoCity[]
}): Promise<
  | {
      cityId: number
      zoneId: number
      areaId: number | null
      cityName: string
      zoneName: string
      areaName: string
    }
  | { error: string }
> {
  let cityId =
    input.cityId != null && Number.isFinite(Number(input.cityId))
      ? Number(input.cityId)
      : null
  let zoneId =
    input.zoneId != null && Number.isFinite(Number(input.zoneId))
      ? Number(input.zoneId)
      : null
  const areaId =
    input.areaId != null && Number(input.areaId) > 0
      ? Number(input.areaId)
      : null

  let cityName = input.cityName.trim()
  let zoneName = input.zoneName.trim()
  const areaName = input.areaName.trim()

  if ((!cityId || !cityName) && cityName) {
    try {
      const cities = input.citiesCache ?? (await getPathaoCities())
      const match = cities.find(
        (city) => city.city_name.toLowerCase() === cityName.toLowerCase(),
      )
      if (match) {
        cityId = match.city_id
        cityName = match.city_name
      }
    } catch (error) {
      console.error(
        '[orders import] Pathao cities',
        error instanceof Error ? error.message : error,
      )
    }
  }

  if (cityId && (!zoneId || zoneName) && zoneName) {
    try {
      const zones = await getPathaoZones(cityId)
      const match = zones.find(
        (zone) => zone.zone_name.toLowerCase() === zoneName.toLowerCase(),
      )
      if (match) {
        zoneId = match.zone_id
        zoneName = match.zone_name
      }
    } catch (error) {
      console.error(
        '[orders import] Pathao zones',
        error instanceof Error ? error.message : error,
      )
    }
  }

  if (!cityName || !zoneName) {
    return { error: 'City and zone names are required.' }
  }

  if (!cityId || !zoneId) {
    return {
      error:
        'Could not match city/zone to Pathao. Use exact Pathao city & zone names (or fill city_id / zone_id).',
    }
  }

  return {
    cityId,
    zoneId,
    areaId,
    cityName,
    zoneName,
    areaName,
  }
}

async function resolveShippingFee(input: {
  shipping?: number | null
  cityId: number
  zoneId: number
}): Promise<{ shipping: number; pathaoDeliveryFee: number | null }> {
  if (
    input.shipping != null &&
    Number.isFinite(input.shipping) &&
    input.shipping >= 0
  ) {
    return {
      shipping: Math.round(Number(input.shipping)),
      pathaoDeliveryFee: null,
    }
  }

  try {
    const quote = await getPathaoPrice({
      recipient_city: input.cityId,
      recipient_zone: input.zoneId,
      item_weight: DELIVERY_REGION_PROBE_WEIGHT_KG,
    })
    const websiteFee = websiteDeliveryFromPathaoQuote(
      Number(quote.final_price) || 0,
    ).websiteFee
    return {
      shipping: websiteFee,
      pathaoDeliveryFee: Number(quote.final_price) || 0,
    }
  } catch (error) {
    console.error(
      '[orders import] Pathao price',
      error instanceof Error ? error.message : error,
    )
    return {
      shipping: WEBSITE_DELIVERY_RATES.ISD,
      pathaoDeliveryFee: null,
    }
  }
}

export type CreatedImportOrder = {
  id: string
  orderNumber: string
  fullName: string
  phone: string
  secondaryPhone: string | null
  email: string | null
  address: string
  cityName: string
  zoneName: string
  areaName: string
  paymentMethod: PaymentMethod
  channel: OrderChannel
  items: Array<{
    name: string
    sizeEu: number
    color: string | null
    price: number
    quantity: number
  }>
  subtotal: number
  shipping: number
  total: number
}

/**
 * Create one order from admin import / manual entry.
 * Mirror of storefront COD create, without gateway redirects.
 */
export async function createImportedOrder(
  db: ViableDbClient,
  row: BulkOrderRowInput,
  options?: { citiesCache?: PathaoCity[] },
): Promise<ActionResult<CreatedImportOrder>> {
  const channel = parseOrderChannel(row.channel) ?? null
  if (!channel) {
    return {
      ok: false,
      error:
        'Channel is required (Messenger, WhatsApp, Phone, Instagram, Shop, Other, or Website).',
    }
  }

  const phone = normalizePathaoPhone(String(row.phone ?? ''))
  if (!isValidBdMobile(phone)) {
    return {
      ok: false,
      error: 'Phone must be an 11-digit BD mobile (e.g. 01712345678).',
    }
  }

  const shopSale = isShopChannel(channel)

  let fullName = String(row.fullName ?? '').trim()
  if (shopSale) {
    fullName = fullName || `Shop · ${phone}`
  } else if (fullName.length < 2) {
    return { ok: false, error: 'Enter the customer full name.' }
  }

  const email = String(row.email ?? '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Email looks invalid.' }
  }

  let address = String(row.address ?? '').trim()
  if (shopSale) {
    address = address || 'Shop pickup'
  } else if (address.length < 5) {
    return { ok: false, error: 'Enter a more detailed delivery address.' }
  }

  const secondaryRaw = String(row.secondaryPhone ?? '').trim()
  const secondaryPhone = secondaryRaw
    ? normalizePathaoPhone(secondaryRaw)
    : null
  if (secondaryPhone && !isValidBdMobile(secondaryPhone)) {
    return {
      ok: false,
      error: 'Secondary phone must be a valid 11-digit BD mobile.',
    }
  }

  let location: {
    cityId: number
    zoneId: number
    areaId: number | null
    cityName: string
    zoneName: string
    areaName: string
  }

  if (shopSale) {
    location = {
      cityId: 0,
      zoneId: 0,
      areaId: null,
      cityName: 'Shop',
      zoneName: 'Pickup',
      areaName: '',
    }
  } else {
    const resolved = await resolvePathaoLocation({
      cityName: String(row.cityName ?? ''),
      zoneName: String(row.zoneName ?? ''),
      areaName: String(row.areaName ?? ''),
      cityId: row.cityId,
      zoneId: row.zoneId,
      areaId: row.areaId,
      citiesCache: options?.citiesCache,
    })
    if ('error' in resolved) {
      return { ok: false, error: resolved.error }
    }
    location = resolved

    const combinedAddress = [
      address,
      location.areaName,
      location.zoneName,
      location.cityName,
    ]
      .filter(Boolean)
      .join(', ')
    if (combinedAddress.length > PATHAO_ADDRESS_MAX_LENGTH) {
      return {
        ok: false,
        error: `Address is too long for Pathao (${combinedAddress.length} chars, max ${PATHAO_ADDRESS_MAX_LENGTH}).`,
      }
    }
  }

  const orderItemsPayload: ResolvedLine[] = []
  const pickerLines = (row.variantLines ?? []).filter(
    (line) => line.variantId?.trim() && Number(line.quantity) > 0,
  )

  if (pickerLines.length > 0) {
    for (const line of pickerLines) {
      const resolved = await resolveVariantById(
        db,
        line.variantId,
        Math.floor(Number(line.quantity)),
      )
      if ('error' in resolved) {
        return { ok: false, error: resolved.error }
      }
      orderItemsPayload.push(resolved)
    }
  } else {
    const parsedItems = parseOrderItemsText(String(row.items ?? ''))
    if ('error' in parsedItems) {
      return { ok: false, error: parsedItems.error }
    }

    for (const line of parsedItems) {
      const resolved = await resolveVariantForLine(db, line)
      if ('error' in resolved) {
        return { ok: false, error: resolved.error }
      }
      orderItemsPayload.push(resolved)
    }
  }

  const preorderLineCount = orderItemsPayload.filter((i) => i.is_preorder)
    .length
  const isPreorderOrder = preorderLineCount > 0
  if (isPreorderOrder && preorderLineCount !== orderItemsPayload.length) {
    return {
      ok: false,
      error:
        'Pre-order items must be on their own order (not mixed with in-stock items).',
    }
  }

  let subtotal = 0
  for (const item of orderItemsPayload) {
    subtotal += item.unit_price * item.quantity
  }

  const fee = shopSale
    ? {
        shipping:
          row.shipping != null &&
          Number.isFinite(row.shipping) &&
          row.shipping >= 0
            ? Math.round(Number(row.shipping))
            : 0,
        pathaoDeliveryFee: null as number | null,
      }
    : await resolveShippingFee({
        shipping: row.shipping,
        cityId: location.cityId,
        zoneId: location.zoneId,
      })

  const paymentMethod = parsePaymentMethod(row.paymentMethod)
  const { shipping, total } = computeCodCheckoutTotals(subtotal, fee.shipping)

  const alreadyPaid =
    parseBool(row.alreadyPaid) ||
    paymentMethod === 'bkash' ||
    paymentMethod === 'nagad'

  const amountPaid = alreadyPaid ? total : 0
  const amountDue = alreadyPaid ? 0 : total
  const notes = String(row.notes ?? '').trim() || null

  const orderNumber = generateOrderNumber()

  const { data: insertedOrder, error: orderInsertError } = await db
    .from('orders')
    .insert({
      order_number: orderNumber,
      status: 'awaiting_fulfillment',
      payment_method: paymentMethod,
      channel,
      email: email || null,
      full_name: fullName,
      phone,
      secondary_phone: secondaryPhone,
      address,
      city_id: location.cityId,
      zone_id: location.zoneId,
      area_id: location.areaId,
      city_name: location.cityName,
      zone_name: location.zoneName,
      area_name: location.areaName,
      subtotal,
      shipping,
      total,
      is_preorder: isPreorderOrder,
      amount_paid: amountPaid,
      amount_due: amountDue,
      pathao_delivery_fee: fee.pathaoDeliveryFee,
      notes,
      ...(alreadyPaid
        ? {
            paid_at: new Date().toISOString(),
          }
        : {}),
    })
    .select('id, order_number')
    .single()

  if (orderInsertError || !insertedOrder) {
    console.error('[orders import] insert', orderInsertError)
    return { ok: false, error: 'Failed to save order.' }
  }

  const { error: itemsInsertError } = await db.from('order_items').insert(
    orderItemsPayload.map((item) => ({
      ...item,
      order_id: insertedOrder.id,
    })),
  )

  if (itemsInsertError) {
    console.error('[orders import] items insert', itemsInsertError)
    await db.from('orders').delete().eq('id', insertedOrder.id)
    return { ok: false, error: 'Failed to save order items.' }
  }

  const stockLines = orderItemsPayload
    .filter((item) => !item.is_preorder)
    .map((item) => ({
      variantId: item.variant_id,
      quantity: item.quantity,
    }))

  if (stockLines.length > 0) {
    const reserved = await decrementOrderStock(db, stockLines)
    if (!reserved.ok) {
      await db.from('order_items').delete().eq('order_id', insertedOrder.id)
      await db.from('orders').delete().eq('id', insertedOrder.id)
      return { ok: false, error: reserved.error }
    }
  }

  return {
    ok: true,
    data: {
      id: insertedOrder.id,
      orderNumber: insertedOrder.order_number,
      fullName,
      phone,
      secondaryPhone,
      email: email || null,
      address,
      cityName: location.cityName,
      zoneName: location.zoneName,
      areaName: location.areaName,
      paymentMethod,
      channel,
      items: orderItemsPayload.map((item) => ({
        name: item.product_name,
        sizeEu: item.size_eu,
        color: item.color,
        price: item.unit_price,
        quantity: item.quantity,
      })),
      subtotal,
      shipping,
      total,
    },
  }
}

