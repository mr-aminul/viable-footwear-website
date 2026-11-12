import {
  bkashApiStyle,
  resolveBkashConfig,
  type BkashConfig,
} from '@/lib/integrations/bkash-settings'

/** Endpoint paths differ between sandbox V2 and production v1.2.0-beta. */
function pathsFor(config: BkashConfig) {
  const style = bkashApiStyle(config.baseUrl)
  if (style === 'v2') {
    return {
      grant: '/auth/grant-token',
      refresh: '/auth/refresh-token',
      create: '/payment/create',
      execute: '/payment/execute',
      query: '/query/payment',
      search: '/general/search-transaction',
      /** V2 Without Agreement omits mode. */
      createNeedsMode: false as const,
    }
  }
  return {
    grant: '/token/grant',
    refresh: '/token/refresh',
    create: '/create',
    execute: '/execute',
    query: '/payment/status',
    search: '/general/searchTransaction',
    /** Classic Without Agreement uses mode 0011. */
    createNeedsMode: true as const,
  }
}

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

type BkashErrorFields = {
  statusMessage?: string
  errorMessage?: string
  errorMessageEn?: string
  msg?: string
  externalCode?: string
  statusCode?: string
}

/**
 * Prefer errorMessageEn per bKash error-code docs so customers see the
 * official English message. https://developer.bka.sh/docs/error-codes
 */
export function customerFacingBkashError(data: BkashErrorFields): string {
  return apiErrorMessage(data) || 'Payment Failed'
}

function apiErrorMessage(data: BkashErrorFields): string | undefined {
  const official =
    data.errorMessageEn || data.errorMessage || data.statusMessage || data.msg
  if (official) return official
  if (data.externalCode) return `Payment error (${data.externalCode})`
  if (data.statusCode && data.statusCode !== '0000') {
    return `Payment error (${data.statusCode})`
  }
  return undefined
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
  const paths = pathsFor(config)
  const res = await fetch(`${config.baseUrl}${paths.grant}`, {
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
  const paths = pathsFor(config)
  const res = await fetch(`${config.baseUrl}${paths.refresh}`, {
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
  const paths = pathsFor(config)
  const body: Record<string, string> = {
    payerReference: input.payerReference || ' ',
    callbackURL: input.callbackURL,
    amount: String(input.amount),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: input.merchantInvoiceNumber,
  }
  // Classic Without Agreement requires mode 0011; V2 omits it.
  if (paths.createNeedsMode) body.mode = '0011'

  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}${paths.create}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
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
  const paths = pathsFor(config)
  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}${paths.execute}`,
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
  const paths = pathsFor(config)
  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}${paths.query}`,
    {
      method: 'POST',
      body: JSON.stringify({ paymentId: paymentID, paymentID }),
    },
  )
  return normalizeExecute((await res.json()) as BkashExecutePaymentResponse)
}

export type BkashSearchTransactionResponse = {
  trxID?: string
  trxId?: string
  transactionStatus?: string
  amount?: string
  currency?: string
  customerMsisdn?: string
  initiationTime?: string
  completedTime?: string
  statusCode?: string
  statusMessage?: string
  errorMessage?: string
  errorMessageEn?: string
  externalCode?: string
}

/** Successful transactions only — search by trxId / trxID from Execute. */
export async function searchBkashTransaction(
  trxID: string,
  override?: BkashConfig,
): Promise<BkashSearchTransactionResponse> {
  const config = await getConfig(override)
  const paths = pathsFor(config)
  const res = await fetchWithTokenRetry(
    config,
    `${config.baseUrl}${paths.search}`,
    {
      method: 'POST',
      // V2 expects trxId; classic docs used trxID — send both.
      body: JSON.stringify({ trxId: trxID, trxID }),
    },
  )
  const data = (await res.json()) as BkashSearchTransactionResponse
  const normalizedId = data.trxID || data.trxId || trxID
  return { ...data, trxID: normalizedId, trxId: normalizedId }
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
