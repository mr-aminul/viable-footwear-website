import {
  resolveBkashConfig,
  type BkashConfig,
} from '@/lib/integrations/bkash-settings'

type GrantTokenResponse = {
  id_token?: string
  refresh_token?: string
  expires_in?: number | string
  statusCode?: string
  statusMessage?: string
  msg?: string
  errorMessage?: string
  errorMessageEn?: string
  externalCode?: string
}

export type BkashCreatePaymentResponse = {
  paymentID?: string
  paymentId?: string
  bkashURL?: string
  statusCode?: string
  statusMessage?: string
  errorMessage?: string
  errorMessageEn?: string
  externalCode?: string
}

export type BkashExecutePaymentResponse = {
  paymentID?: string
  paymentId?: string
  trxID?: string
  trxId?: string
  transactionStatus?: string
  amount?: string
  statusCode?: string
  statusMessage?: string
  errorMessage?: string
  errorMessageEn?: string
  externalCode?: string
}

type CachedToken = {
  idToken: string
  refreshToken: string | null
  /** Epoch ms when we should stop using this token (before bKash expiry). */
  refreshAt: number
  baseUrl: string
  appKey: string
}

/** Process-local cache — Grant Token is limited to 2 calls/hour. */
let tokenCache: CachedToken | null = null

function apiErrorMessage(data: {
  statusMessage?: string
  errorMessage?: string
  errorMessageEn?: string
  msg?: string
  externalCode?: string
}): string | undefined {
  return (
    data.statusMessage ||
    data.errorMessageEn ||
    data.errorMessage ||
    data.msg ||
    (data.externalCode ? `bKash error ${data.externalCode}` : undefined)
  )
}

function paymentIdOf(
  data: { paymentID?: string; paymentId?: string } | null | undefined,
): string | undefined {
  return data?.paymentID || data?.paymentId || undefined
}

function trxIdOf(
  data: { trxID?: string; trxId?: string } | null | undefined,
): string | undefined {
  return data?.trxID || data?.trxId || undefined
}

/** Normalize V2 camelCase fields onto the legacy names callers already use. */
function normalizeCreate(
  data: BkashCreatePaymentResponse,
): BkashCreatePaymentResponse {
  const paymentID = paymentIdOf(data)
  return { ...data, paymentID, paymentId: paymentID }
}

function normalizeExecute(
  data: BkashExecutePaymentResponse,
): BkashExecutePaymentResponse {
  const paymentID = paymentIdOf(data)
  const trxID = trxIdOf(data)
  return {
    ...data,
    paymentID,
    paymentId: paymentID,
    trxID,
    trxId: trxID,
  }
}

async function getConfig(override?: BkashConfig): Promise<BkashConfig> {
  if (override) return override
  return resolveBkashConfig()
}

function cacheMatches(config: BkashConfig): boolean {
  return Boolean(
    tokenCache &&
      tokenCache.baseUrl === config.baseUrl &&
      tokenCache.appKey === config.appKey &&
      Date.now() < tokenCache.refreshAt,
  )
}

function storeToken(config: BkashConfig, data: GrantTokenResponse): string {
  if (!data.id_token) {
    throw new Error(apiErrorMessage(data) || 'bKash token missing id_token')
  }
  const expiresInSec = Number(data.expires_in) || 3600
  // Refresh ~10 minutes before expiry (min 60s buffer).
  const usableMs = Math.max(60, expiresInSec - 600) * 1000
  tokenCache = {
    idToken: data.id_token,
    refreshToken: data.refresh_token || null,
    refreshAt: Date.now() + usableMs,
    baseUrl: config.baseUrl,
    appKey: config.appKey,
  }
  return data.id_token
}

async function requestGrant(config: BkashConfig): Promise<string> {
  const res = await fetch(`${config.baseUrl}/auth/grant-token`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
    }),
  })
  const data = (await res.json()) as GrantTokenResponse
  if (!res.ok || !data.id_token) {
    throw new Error(
      apiErrorMessage(data) || `bKash token failed (${res.status})`,
    )
  }
  return storeToken(config, data)
}

async function requestRefresh(config: BkashConfig): Promise<string | null> {
  const refresh = tokenCache?.refreshToken
  if (!refresh) return null
  const res = await fetch(`${config.baseUrl}/auth/refresh-token`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
      refresh_token: refresh,
    }),
  })
  const data = (await res.json()) as GrantTokenResponse
  if (!res.ok || !data.id_token) return null
  return storeToken(config, data)
}

export async function grantBkashToken(override?: BkashConfig): Promise<string> {
  const config = await getConfig(override)
  if (cacheMatches(config) && tokenCache) return tokenCache.idToken

  if (tokenCache?.refreshToken && tokenCache.baseUrl === config.baseUrl) {
    const refreshed = await requestRefresh(config)
    if (refreshed) return refreshed
  }

  return requestGrant(config)
}

function clearTokenCache() {
  tokenCache = null
}

async function withAuthHeaders(config: BkashConfig) {
  const token = await grantBkashToken(config)
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    authorization: token,
    'x-app-key': config.appKey,
  } as Record<string, string>
}

async function fetchWithTokenRetry(
  config: BkashConfig,
  url: string,
  init: RequestInit,
): Promise<Response> {
  const headers = await withAuthHeaders(config)
  let res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { ...headers, ...(init.headers as Record<string, string>) },
  })
  if (res.status === 401 || res.status === 403) {
    clearTokenCache()
    const retryHeaders = await withAuthHeaders(config)
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { ...retryHeaders, ...(init.headers as Record<string, string>) },
    })
  }
  return res
}

export async function createBkashPayment(input: {
  amount: number
  merchantInvoiceNumber: string
  callbackURL: string
  payerReference?: string
  override?: BkashConfig
}): Promise<BkashCreatePaymentResponse> {
  const config = await getConfig(input.override)
  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}/payment/create`,
    {
      method: 'POST',
      body: JSON.stringify({
        // V2 Without Agreement: do not send mode
        payerReference: input.payerReference || ' ',
        callbackURL: input.callbackURL,
        amount: String(input.amount),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: input.merchantInvoiceNumber,
      }),
    },
  )
  const data = normalizeCreate(
    (await res.json()) as BkashCreatePaymentResponse,
  )
  if (!data.bkashURL || !data.paymentID) {
    throw new Error(apiErrorMessage(data) || 'bKash create payment failed')
  }
  return data
}

export async function executeBkashPayment(
  paymentID: string,
  override?: BkashConfig,
): Promise<BkashExecutePaymentResponse> {
  const config = await getConfig(override)
  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}/payment/execute`,
    {
      method: 'POST',
      body: JSON.stringify({ paymentId: paymentID, paymentID }),
    },
  )
  return normalizeExecute((await res.json()) as BkashExecutePaymentResponse)
}

/** Mandatory when Execute does not respond within ~30s (per bKash integration email). */
export async function queryBkashPayment(
  paymentID: string,
  override?: BkashConfig,
): Promise<BkashExecutePaymentResponse> {
  const config = await getConfig(override)
  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}/query/payment`,
    {
      method: 'POST',
      body: JSON.stringify({ paymentId: paymentID, paymentID }),
    },
  )
  return normalizeExecute((await res.json()) as BkashExecutePaymentResponse)
}

export function isBkashPaymentCompleted(
  result: BkashExecutePaymentResponse,
): boolean {
  const status = (result.transactionStatus || '').toLowerCase()
  if (status === 'completed') return true
  return result.statusCode === '0000' && status !== 'failed'
}

/** Prepaid checkout total: Pathao delivery after campaign, then ceil (no COD inflate). */
export function computePrepaidCheckoutTotals(
  subtotal: number,
  deliveryFeeAfterCampaign: number,
): { shipping: number; total: number } {
  const delivery = Math.max(0, deliveryFeeAfterCampaign)
  const total = Math.ceil(Math.max(0, subtotal) + delivery)
  return { shipping: delivery, total }
}
