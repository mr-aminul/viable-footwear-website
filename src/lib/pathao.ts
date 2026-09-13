/**
 * Pathao Courier Merchant API client.
 * Credentials resolve from Admin → Integrations (DB), with env fallback.
 * @see https://developer.pathao.com (API docs)
 */

import {
  resolvePathaoConfig,
  type PathaoConfig,
} from '@/lib/integrations/pathao-settings'

const TOKEN_PATH = '/aladdin/api/v1/issue-token'
const ORDERS_PATH = '/aladdin/api/v1/orders'

export interface PathaoTokenResponse {
  token_type: string
  expires_in: number
  access_token: string
  refresh_token: string
}

export interface PathaoCreateOrderPayload {
  store_id: number
  merchant_order_id?: string
  recipient_name: string
  recipient_phone: string
  recipient_secondary_phone?: string
  recipient_address: string
  recipient_city?: number
  recipient_zone?: number
  recipient_area?: number
  delivery_type: number
  item_type: number
  item_quantity: number
  item_weight: string
  amount_to_collect: number
  special_instruction?: string
  item_description?: string
}

export interface PathaoCity {
  city_id: number
  city_name: string
}

export interface PathaoZone {
  zone_id: number
  zone_name: string
}

export interface PathaoArea {
  area_id: number
  area_name: string
  home_delivery_available?: boolean
  pickup_available?: boolean
}

export interface PathaoPriceParams {
  recipient_city: number
  recipient_zone: number
  item_weight?: number
}

export interface PathaoPriceResponse {
  price: number
  final_price: number
  cod_enabled?: number
}

export interface PathaoCreateOrderResponse {
  message: string
  type: string
  code: number
  data: {
    consignment_id: string
    merchant_order_id?: string
    order_status: string
    delivery_fee: number
  }
}

export interface PathaoCancelOrderResponse {
  message: string
  type: string
  code: number
  data?: unknown
}

export interface PathaoCancelOrderResult {
  alreadyCancelled: boolean
}

export interface PathaoOrderInfo {
  consignment_id: string
  merchant_order_id?: string | null
  order_status: string
  order_status_slug: string
}

function isCancelledOrderStatus(info: PathaoOrderInfo): boolean {
  const slug = (info.order_status_slug || '').toLowerCase()
  const status = (info.order_status || '').toLowerCase()
  return slug.includes('cancel') || status.includes('cancel')
}

async function getConfig(override?: PathaoConfig): Promise<PathaoConfig> {
  if (override) return override
  return resolvePathaoConfig()
}

/**
 * Issue an access token using password grant.
 */
export async function getPathaoAccessToken(
  override?: PathaoConfig,
): Promise<string> {
  const config = await getConfig(override)

  const res = await fetch(`${config.baseUrl}${TOKEN_PATH}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'password',
      username: config.username,
      password: config.password,
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try {
      const j = JSON.parse(text) as { message?: string; error?: string }
      msg = j.message || j.error || text
    } catch {
      // use raw text
    }
    throw new Error(`Pathao token failed (${res.status}): ${msg}`)
  }

  let data: PathaoTokenResponse
  try {
    data = JSON.parse(text) as PathaoTokenResponse
  } catch {
    throw new Error('Pathao token response was not valid JSON')
  }
  if (!data.access_token) {
    throw new Error('Pathao token response missing access_token')
  }
  return data.access_token
}

/**
 * Create a new delivery order in Pathao Courier.
 */
export async function createPathaoOrder(
  payload: PathaoCreateOrderPayload,
): Promise<PathaoCreateOrderResponse> {
  const config = await getConfig()
  const token = await getPathaoAccessToken(config)

  const res = await fetch(`${config.baseUrl}${ORDERS_PATH}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let data: PathaoCreateOrderResponse & { message?: string; type?: string }
  try {
    data = JSON.parse(text) as PathaoCreateOrderResponse & {
      message?: string
      type?: string
    }
  } catch {
    throw new Error(
      `Pathao create order failed (${res.status}): ${text.slice(0, 200)}`,
    )
  }

  if (!res.ok) {
    const msg =
      data.message || data.type || res.statusText || text.slice(0, 200)
    throw new Error(`Pathao create order failed (${res.status}): ${msg}`)
  }

  if (data.type !== 'success' || data.code !== 200) {
    throw new Error(data.message || 'Pathao order creation returned non-success')
  }

  return data as PathaoCreateOrderResponse
}

/**
 * Get the current status of a consignment.
 */
export async function getPathaoOrderInfo(
  consignmentId: string,
): Promise<PathaoOrderInfo> {
  const trimmedId = consignmentId.trim()
  if (!trimmedId) {
    throw new Error('Pathao consignment ID is required')
  }
  return pathaoGet<PathaoOrderInfo>(
    `${ORDERS_PATH}/${encodeURIComponent(trimmedId)}/info`,
  )
}

/**
 * Cancel an existing Pathao consignment.
 */
export async function cancelPathaoOrder(
  consignmentId: string,
): Promise<PathaoCancelOrderResult> {
  const trimmedId = consignmentId.trim()
  if (!trimmedId) {
    throw new Error('Pathao consignment ID is required')
  }

  const config = await getConfig()
  const token = await getPathaoAccessToken(config)

  const res = await fetch(
    `${config.baseUrl}${ORDERS_PATH}/${encodeURIComponent(trimmedId)}/cancel`,
    {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const text = await res.text()
  let data: PathaoCancelOrderResponse & { message?: string; type?: string }
  try {
    data = JSON.parse(text) as PathaoCancelOrderResponse & {
      message?: string
      type?: string
    }
  } catch {
    throw new Error(
      `Pathao cancel order failed (${res.status}): ${text.slice(0, 200)}`,
    )
  }

  if (res.ok && data.type === 'success' && data.code === 200) {
    return { alreadyCancelled: false }
  }

  const rejectMessage =
    data.message || data.type || res.statusText || text.slice(0, 200)

  let info: PathaoOrderInfo | null = null
  try {
    info = await getPathaoOrderInfo(trimmedId)
  } catch {
    // Fall through
  }

  if (info && isCancelledOrderStatus(info)) {
    return { alreadyCancelled: true }
  }

  const statusSuffix = info ? ` (current status: ${info.order_status})` : ''
  throw new Error(`Pathao cancel order failed: ${rejectMessage}${statusSuffix}`)
}

async function pathaoGet<T>(
  path: string,
  override?: PathaoConfig,
): Promise<T> {
  const config = await getConfig(override)
  const token = await getPathaoAccessToken(config)
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const text = await res.text()
  let data: {
    type?: string
    code?: number
    data?: unknown
    message?: string
  }
  try {
    data = JSON.parse(text) as {
      type?: string
      code?: number
      data?: unknown
      message?: string
    }
  } catch {
    throw new Error(`Pathao API error (${res.status}): ${text.slice(0, 200)}`)
  }
  if (!res.ok || data.type !== 'success') {
    throw new Error(data.message || `Pathao API error (${res.status})`)
  }
  return data.data as T
}

export async function getPathaoCities(
  override?: PathaoConfig,
): Promise<PathaoCity[]> {
  const data = await pathaoGet<{ data: PathaoCity[] }>(
    '/aladdin/api/v1/city-list',
    override,
  )
  return Array.isArray(data?.data) ? data.data : []
}

export async function getPathaoZones(cityId: number): Promise<PathaoZone[]> {
  const data = await pathaoGet<{ data: PathaoZone[] }>(
    `/aladdin/api/v1/cities/${cityId}/zone-list`,
  )
  return Array.isArray(data?.data) ? data.data : []
}

export async function getPathaoAreas(zoneId: number): Promise<PathaoArea[]> {
  const data = await pathaoGet<{ data: PathaoArea[] }>(
    `/aladdin/api/v1/zones/${zoneId}/area-list`,
  )
  return Array.isArray(data?.data) ? data.data : []
}

export async function getPathaoPrice(
  params: PathaoPriceParams,
): Promise<PathaoPriceResponse> {
  const config = await getConfig()
  const token = await getPathaoAccessToken(config)
  const storeId = config.storeId
  if (!storeId) {
    throw new Error('PATHAO store ID is required for price calculation')
  }

  const body = {
    store_id: parseInt(storeId, 10),
    item_type: 2,
    delivery_type: 48,
    item_weight: params.item_weight ?? 0.5,
    recipient_city: params.recipient_city,
    recipient_zone: params.recipient_zone,
  }

  const res = await fetch(`${config.baseUrl}/aladdin/api/v1/merchant/price-plan`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let response: {
    type?: string
    code?: number
    message?: string
    data?: PathaoPriceResponse
  }
  try {
    response = JSON.parse(text) as {
      type?: string
      code?: number
      message?: string
      data?: PathaoPriceResponse
    }
  } catch {
    throw new Error(
      `Pathao price API error (${res.status}): ${text.slice(0, 200)}`,
    )
  }

  if (!res.ok || response.type !== 'success') {
    throw new Error(response.message || `Pathao price failed (${res.status})`)
  }

  const data = response.data
  if (!data) {
    throw new Error('Pathao price response missing data')
  }

  return {
    price: data.price ?? 0,
    final_price: data.final_price ?? data.price ?? 0,
    cod_enabled: data.cod_enabled,
  }
}

/**
 * Normalize Bangladeshi phone to 11 digits (e.g. 01712345678).
 */
export function normalizePathaoPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('01')) return digits
  if (digits.length === 13 && digits.startsWith('8801')) return digits.slice(2)
  if (digits.length === 10 && digits.startsWith('1')) return '0' + digits
  return digits.slice(-11)
}
