import {
  resolveBkashConfig,
  type BkashConfig,
} from '@/lib/integrations/bkash-settings'

type GrantTokenResponse = {
  id_token?: string
  statusCode?: string
  statusMessage?: string
  msg?: string
  errorMessage?: string
}

export type BkashCreatePaymentResponse = {
  paymentID?: string
  bkashURL?: string
  statusCode?: string
  statusMessage?: string
  errorMessage?: string
}

export type BkashExecutePaymentResponse = {
  paymentID?: string
  trxID?: string
  transactionStatus?: string
  amount?: string
  statusCode?: string
  statusMessage?: string
  errorMessage?: string
}

async function getConfig(override?: BkashConfig): Promise<BkashConfig> {
  if (override) return override
  return resolveBkashConfig()
}

export async function grantBkashToken(override?: BkashConfig): Promise<string> {
  const config = await getConfig(override)
  const res = await fetch(`${config.baseUrl}/checkout/token/grant`, {
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
      data.statusMessage ||
        data.errorMessage ||
        data.msg ||
        `bKash token failed (${res.status})`,
    )
  }
  return data.id_token
}

export async function createBkashPayment(input: {
  amount: number
  merchantInvoiceNumber: string
  callbackURL: string
  payerReference?: string
  override?: BkashConfig
}): Promise<BkashCreatePaymentResponse> {
  const config = await getConfig(input.override)
  const token = await grantBkashToken(config)
  const res = await fetch(`${config.baseUrl}/checkout/create`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      authorization: token,
      'x-app-key': config.appKey,
    },
    body: JSON.stringify({
      mode: '0011',
      payerReference: input.payerReference || ' ',
      callbackURL: input.callbackURL,
      amount: String(input.amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: input.merchantInvoiceNumber,
    }),
  })
  const data = (await res.json()) as BkashCreatePaymentResponse
  if (!data.bkashURL || !data.paymentID) {
    throw new Error(
      data.statusMessage ||
        data.errorMessage ||
        'bKash create payment failed',
    )
  }
  return data
}

export async function executeBkashPayment(
  paymentID: string,
  override?: BkashConfig,
): Promise<BkashExecutePaymentResponse> {
  const config = await getConfig(override)
  const token = await grantBkashToken(config)
  const res = await fetch(`${config.baseUrl}/checkout/execute`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      authorization: token,
      'x-app-key': config.appKey,
    },
    body: JSON.stringify({ paymentID }),
  })
  return (await res.json()) as BkashExecutePaymentResponse
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
