/**
 * Pathao Courier Merchant API client.
 * Credentials resolve from Admin → Integrations (DB), with env fallback.
 * @see https://developer.pathao.com (API docs)
 */

import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import tls from 'node:tls'
import { URL } from 'node:url'
import {
  resolvePathaoConfig,
  type PathaoConfig,
} from '@/lib/integrations/pathao-settings'

const TOKEN_PATH = '/aladdin/api/v1/issue-token'
const ORDERS_PATH = '/aladdin/api/v1/orders'

let cachedHttpsAgent: https.Agent | null | undefined

/**
 * Optional TLS overrides for local networks that intercept HTTPS
 * (corporate proxy / "Forward Trust" CA). Production Vercel does not need these.
 *
 * PATHAO_CA_FILE — path to a PEM CA to trust (relative to project root or absolute)
 * PATHAO_TLS_INSECURE=1 — disable TLS verification (local debugging only)
 */
function getPathaoHttpsAgent(): https.Agent | undefined {
  if (cachedHttpsAgent !== undefined) {
    return cachedHttpsAgent ?? undefined
  }

  const insecure =
    process.env.PATHAO_TLS_INSECURE === '1' ||
    process.env.PATHAO_TLS_INSECURE === 'true'
  if (insecure) {
    cachedHttpsAgent = new https.Agent({ rejectUnauthorized: false })
    return cachedHttpsAgent
  }

  const caFile = process.env.PATHAO_CA_FILE?.trim()
  if (!caFile) {
    cachedHttpsAgent = null
    return undefined
  }

  const absolute = path.isAbsolute(caFile)
    ? caFile
    : path.join(process.cwd(), caFile)
  if (!fs.existsSync(absolute)) {
    cachedHttpsAgent = null
    throw new Error(
      `PATHAO_CA_FILE not found: ${absolute}. Remove the env var or place the PEM there.`,
    )
  }

  const extraCa = fs.readFileSync(absolute)
  cachedHttpsAgent = new https.Agent({
    ca: [...tls.rootCertificates, extraCa],
  })
  return cachedHttpsAgent
}

function formatPathaoNetworkError(err: unknown): Error {
  const cause =
    err && typeof err === 'object' && 'cause' in err
      ? (err as { cause?: unknown }).cause
      : undefined
  const causeObj =
    cause && typeof cause === 'object'
      ? (cause as { code?: string; message?: string })
      : null
  const code = causeObj?.code
  const detail =
    code ||
    causeObj?.message ||
    (err instanceof Error ? err.message : String(err))

  if (
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    String(detail).includes('certificate')
  ) {
    return new Error(
      `Pathao TLS failed (${detail}). Your network is intercepting HTTPS. Set PATHAO_CA_FILE to your proxy CA PEM (local), or cancel from production.`,
    )
  }

  return new Error(`Pathao request failed: ${detail}`)
}

/** fetch() with optional Pathao TLS agent + clearer network errors. */
async function pathaoFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const agent = getPathaoHttpsAgent()

  if (!agent) {
    try {
      return await fetch(url, init)
    } catch (err) {
      throw formatPathaoNetworkError(err)
    }
  }

  return new Promise<Response>((resolve, reject) => {
    try {
      const parsed = new URL(url)
      const method = (init.method || 'GET').toUpperCase()
      const headerBag = new Headers(init.headers)
      const headers: Record<string, string> = {}
      headerBag.forEach((value, key) => {
        headers[key] = value
      })

      const body =
        typeof init.body === 'string'
          ? init.body
          : init.body != null
            ? String(init.body)
            : undefined
      if (body != null && !headers['content-length'] && !headers['Content-Length']) {
        headers['Content-Length'] = String(Buffer.byteLength(body))
      }

      const req = https.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: `${parsed.pathname}${parsed.search}`,
          method,
          headers,
          agent,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const buffer = Buffer.concat(chunks)
            const responseHeaders = new Headers()
            for (const [key, value] of Object.entries(res.headers)) {
              if (value == null) continue
              if (Array.isArray(value)) {
                for (const item of value) responseHeaders.append(key, item)
              } else {
                responseHeaders.set(key, value)
              }
            }
            resolve(
              new Response(buffer, {
                status: res.statusCode ?? 0,
                statusText: res.statusMessage,
                headers: responseHeaders,
              }),
            )
          })
        },
      )

      req.on('error', (err) => reject(formatPathaoNetworkError(err)))
      if (body != null) req.write(body)
      req.end()
    } catch (err) {
      reject(formatPathaoNetworkError(err))
    }
  })
}

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

/**
 * Pathao often returns this after a consignment is cancelled in the merchant
 * panel (the /info endpoint no longer finds the parcel).
 */
export function isPathaoOrderNotFoundError(message: string): boolean {
  const text = message.trim().toLowerCase()
  return (
    text.includes('order not found') ||
    text.includes('consignment not found') ||
    text.includes('parcel not found')
  )
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

  const res = await pathaoFetch(`${config.baseUrl}${TOKEN_PATH}`, {
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

  const res = await pathaoFetch(`${config.baseUrl}${ORDERS_PATH}`, {
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

  const res = await pathaoFetch(
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isPathaoOrderNotFoundError(message)) {
      return { alreadyCancelled: true }
    }
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
  const res = await pathaoFetch(`${config.baseUrl}${path}`, {
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

  const res = await pathaoFetch(
    `${config.baseUrl}/aladdin/api/v1/merchant/price-plan`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  )

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
