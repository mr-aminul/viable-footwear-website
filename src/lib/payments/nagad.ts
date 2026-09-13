import { createHash, constants, createSign, privateDecrypt, publicEncrypt } from 'crypto'
import {
  NAGAD_API_VERSION,
  resolveNagadConfig,
  type NagadConfig,
} from '@/lib/integrations/nagad-settings'

export type NagadVerifyResponse = {
  merchantId?: string
  orderId?: string
  paymentRefId?: string
  amount?: string
  clientMobileNo?: string
  merchantMobileNo?: string
  orderDateTime?: string
  issuerPaymentDateTime?: string
  issuerPaymentRefNo?: string
  additionalMerchantInfo?: unknown
  status?: string
  statusCode?: string
  message?: string
}

type InitializeSensitive = {
  merchantId: string
  datetime: string
  orderId: string
  challenge: string
}

type ConfirmSensitive = {
  merchantId: string
  orderId: string
  amount: string
  currencyCode: string
  challenge: string
}

async function getConfig(override?: NagadConfig): Promise<NagadConfig> {
  if (override) return override
  return resolveNagadConfig()
}

function formatPem(key: string, type: 'PUBLIC' | 'PRIVATE'): string {
  const trimmed = key.trim().replace(/\\n/g, '\n')
  if (/begin/i.test(trimmed)) return trimmed
  return `-----BEGIN ${type} KEY-----\n${trimmed}\n-----END ${type} KEY-----`
}

function dhakaTimestamp(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`
}

function challengeHash(orderId: string): string {
  return createHash('sha1').update(orderId).digest('hex').toUpperCase()
}

function encryptWithNagadPublic(
  publicKeyPem: string,
  data: unknown,
): string {
  const encrypted = publicEncrypt(
    {
      key: formatPem(publicKeyPem, 'PUBLIC'),
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(JSON.stringify(data)),
  )
  return encrypted.toString('base64')
}

function decryptWithMerchantPrivate<T>(
  privateKeyPem: string,
  data: string,
): T {
  const decrypted = privateDecrypt(
    {
      key: formatPem(privateKeyPem, 'PRIVATE'),
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(data, 'base64'),
  ).toString('utf8')
  return JSON.parse(decrypted) as T
}

function signWithMerchantPrivate(
  privateKeyPem: string,
  data: unknown,
): string {
  const signer = createSign('SHA256')
  signer.update(JSON.stringify(data))
  signer.end()
  return signer.sign(formatPem(privateKeyPem, 'PRIVATE'), 'base64')
}

function normalizeClientIp(ip: string): string {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return '103.100.200.100'
  // Strip IPv6-mapped IPv4
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  return ip
}

async function nagadPost<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-KM-Api-Version': NAGAD_API_VERSION,
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string
    reason?: string
    status?: string
  }
  if (!res.ok) {
    throw new Error(
      data.message || data.reason || `Nagad request failed (${res.status})`,
    )
  }
  return data
}

async function nagadGet<T>(
  url: string,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-KM-Api-Version': NAGAD_API_VERSION,
      ...headers,
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string
    reason?: string
  }
  if (!res.ok) {
    throw new Error(
      data.message || data.reason || `Nagad verify failed (${res.status})`,
    )
  }
  return data
}

/** Soft credential check: PEM format + encrypt/sign without calling Nagad. */
export function assertNagadKeysUsable(config: NagadConfig): void {
  const sensitive: InitializeSensitive = {
    merchantId: config.merchantId,
    datetime: dhakaTimestamp(),
    orderId: `TEST${Date.now()}`,
    challenge: challengeHash(`TEST${Date.now()}`),
  }
  encryptWithNagadPublic(config.nagadPublicKey, sensitive)
  signWithMerchantPrivate(config.merchantPrivateKey, sensitive)
}

/**
 * Initialize + complete handshake; returns customer redirect URL and paymentRefId.
 */
export async function createNagadPayment(input: {
  amount: number
  orderId: string
  clientIp: string
  callbackURL: string
  productDetails?: Record<string, string>
  override?: NagadConfig
}): Promise<{ redirectUrl: string; paymentRefId: string }> {
  const config = await getConfig(input.override)
  const ip = normalizeClientIp(input.clientIp)
  const timestamp = dhakaTimestamp()
  const orderId = input.orderId

  const initSensitive: InitializeSensitive = {
    merchantId: config.merchantId,
    datetime: timestamp,
    orderId,
    challenge: challengeHash(orderId),
  }

  const initPayload = {
    accountNumber: config.merchantNumber,
    dateTime: timestamp,
    sensitiveData: encryptWithNagadPublic(
      config.nagadPublicKey,
      initSensitive,
    ),
    signature: signWithMerchantPrivate(
      config.merchantPrivateKey,
      initSensitive,
    ),
  }

  const initRes = await nagadPost<{
    sensitiveData?: string
    signature?: string
    message?: string
  }>(
    `${config.baseUrl}/api/dfs/check-out/initialize/${config.merchantId}/${encodeURIComponent(orderId)}`,
    initPayload,
    {
      'X-KM-IP-V4': ip,
      'X-KM-Client-Type': 'PC_WEB',
    },
  )

  if (!initRes.sensitiveData) {
    throw new Error(initRes.message || 'Nagad initialize failed.')
  }

  const decrypted = decryptWithMerchantPrivate<{
    paymentReferenceId?: string
    challenge?: string
  }>(config.merchantPrivateKey, initRes.sensitiveData)

  const paymentReferenceId = decrypted.paymentReferenceId
  const challenge = decrypted.challenge
  if (!paymentReferenceId || !challenge) {
    throw new Error('Nagad initialize response missing payment reference.')
  }

  const confirmSensitive: ConfirmSensitive = {
    merchantId: config.merchantId,
    orderId,
    amount: String(input.amount),
    currencyCode: '050',
    challenge,
  }

  const confirmPayload = {
    paymentRefId: paymentReferenceId,
    sensitiveData: encryptWithNagadPublic(
      config.nagadPublicKey,
      confirmSensitive,
    ),
    signature: signWithMerchantPrivate(
      config.merchantPrivateKey,
      confirmSensitive,
    ),
    merchantCallbackURL: input.callbackURL,
    additionalMerchantInfo: input.productDetails ?? {},
  }

  const confirmRes = await nagadPost<{
    callBackUrl?: string
    message?: string
  }>(
    `${config.baseUrl}/api/dfs/check-out/complete/${encodeURIComponent(paymentReferenceId)}`,
    confirmPayload,
    {
      'X-KM-IP-V4': ip,
      'X-KM-Client-Type': 'PC_WEB',
    },
  )

  if (!confirmRes.callBackUrl) {
    throw new Error(confirmRes.message || 'Nagad complete failed.')
  }

  return {
    redirectUrl: confirmRes.callBackUrl,
    paymentRefId: paymentReferenceId,
  }
}

export async function verifyNagadPayment(
  paymentRefId: string,
  override?: NagadConfig,
): Promise<NagadVerifyResponse> {
  const config = await getConfig(override)
  return nagadGet<NagadVerifyResponse>(
    `${config.baseUrl}/api/dfs/verify/payment/${encodeURIComponent(paymentRefId)}`,
  )
}

export function isNagadPaymentSuccessful(
  verified: NagadVerifyResponse,
): boolean {
  const status = (verified.status || '').toLowerCase()
  return status === 'success' || verified.statusCode === 'Success'
}
