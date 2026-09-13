import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/admin'

export const NAGAD_SETTINGS_KEY = 'nagad'

/** Sandbox host from Nagad merchant docs (HTTP on :10080). */
export const NAGAD_SANDBOX_BASE =
  'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0'
export const NAGAD_PRODUCTION_BASE = 'https://api.mynagad.com'
export const NAGAD_API_VERSION = 'v-0.2.0'

export type NagadMode = 'sandbox' | 'production'

export type NagadConfig = {
  mode: NagadMode
  baseUrl: string
  merchantId: string
  merchantNumber: string
  /** Merchant RSA private key (PEM or bare base64 body). */
  merchantPrivateKey: string
  /** Nagad PG RSA public key (PEM or bare base64 body). */
  nagadPublicKey: string
}

export type NagadSettingsView = {
  configured: boolean
  source: 'admin' | 'env' | 'none'
  mode: NagadMode
  merchantId: string
  merchantNumber: string
  hasMerchantPrivateKey: boolean
  hasNagadPublicKey: boolean
  callbackUrl: string
  updatedAt: string | null
}

type StoredNagadValue = {
  mode?: NagadMode
  base_url?: string
  merchant_id?: string
  merchant_number?: string
  merchant_private_key?: string
  nagad_public_key?: string
}

function baseUrlForMode(mode: NagadMode): string {
  return mode === 'production' ? NAGAD_PRODUCTION_BASE : NAGAD_SANDBOX_BASE
}

function readEnvConfig(): Partial<NagadConfig> {
  const mode: NagadMode =
    process.env.NAGAD_MODE?.trim() === 'production' ? 'production' : 'sandbox'
  return {
    mode,
    baseUrl: process.env.NAGAD_BASE_URL?.trim() || baseUrlForMode(mode),
    merchantId: process.env.NAGAD_MERCHANT_ID?.trim() || undefined,
    merchantNumber: process.env.NAGAD_MERCHANT_NUMBER?.trim() || undefined,
    merchantPrivateKey:
      process.env.NAGAD_MERCHANT_PRIVATE_KEY?.trim() || undefined,
    nagadPublicKey: process.env.NAGAD_PUBLIC_KEY?.trim() || undefined,
  }
}

function isComplete(config: Partial<NagadConfig>): config is NagadConfig {
  return Boolean(
    config.mode &&
      config.baseUrl &&
      config.merchantId &&
      config.merchantNumber &&
      config.merchantPrivateKey &&
      config.nagadPublicKey,
  )
}

async function readStoredValue(): Promise<{
  value: StoredNagadValue | null
  updatedAt: string | null
}> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('integration_settings')
      .select('value, updated_at')
      .eq('key', NAGAD_SETTINGS_KEY)
      .maybeSingle()
    if (error || !data) return { value: null, updatedAt: null }
    const value =
      data.value && typeof data.value === 'object' && !Array.isArray(data.value)
        ? (data.value as StoredNagadValue)
        : null
    return { value, updatedAt: data.updated_at ?? null }
  } catch {
    return { value: null, updatedAt: null }
  }
}

function storedToPartial(value: StoredNagadValue | null): Partial<NagadConfig> {
  if (!value) return {}
  const mode: NagadMode =
    value.mode === 'production' ? 'production' : 'sandbox'
  return {
    mode,
    baseUrl: value.base_url?.trim() || baseUrlForMode(mode),
    merchantId: value.merchant_id?.trim() || undefined,
    merchantNumber: value.merchant_number?.trim() || undefined,
    merchantPrivateKey: value.merchant_private_key?.trim() || undefined,
    nagadPublicKey: value.nagad_public_key?.trim() || undefined,
  }
}

export const resolveNagadConfig = cache(async (): Promise<NagadConfig> => {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  if (isComplete(fromDb)) return fromDb

  const fromEnv = readEnvConfig()
  const mode = fromDb.mode || fromEnv.mode || 'sandbox'
  const merged: Partial<NagadConfig> = {
    mode,
    baseUrl: fromDb.baseUrl || fromEnv.baseUrl || baseUrlForMode(mode),
    merchantId: fromDb.merchantId || fromEnv.merchantId,
    merchantNumber: fromDb.merchantNumber || fromEnv.merchantNumber,
    merchantPrivateKey:
      fromDb.merchantPrivateKey || fromEnv.merchantPrivateKey,
    nagadPublicKey: fromDb.nagadPublicKey || fromEnv.nagadPublicKey,
  }
  if (!isComplete(merged)) {
    throw new Error(
      'Nagad is not configured. Open Admin → Integrations and save credentials.',
    )
  }
  return merged
})

export async function isNagadConfigured(): Promise<boolean> {
  try {
    await resolveNagadConfig()
    return true
  } catch {
    return false
  }
}

export async function getNagadSettingsView(): Promise<NagadSettingsView> {
  const { value, updatedAt } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'

  const dbComplete = isComplete(fromDb)
  const envComplete = isComplete({
    mode: fromEnv.mode || 'sandbox',
    baseUrl: fromEnv.baseUrl || NAGAD_SANDBOX_BASE,
    merchantId: fromEnv.merchantId,
    merchantNumber: fromEnv.merchantNumber,
    merchantPrivateKey: fromEnv.merchantPrivateKey,
    nagadPublicKey: fromEnv.nagadPublicKey,
  })

  const source: NagadSettingsView['source'] = dbComplete
    ? 'admin'
    : envComplete
      ? 'env'
      : 'none'

  return {
    configured: source !== 'none',
    source,
    mode: fromDb.mode || fromEnv.mode || 'sandbox',
    merchantId: fromDb.merchantId || fromEnv.merchantId || '',
    merchantNumber: fromDb.merchantNumber || fromEnv.merchantNumber || '',
    hasMerchantPrivateKey: Boolean(
      fromDb.merchantPrivateKey || fromEnv.merchantPrivateKey,
    ),
    hasNagadPublicKey: Boolean(fromDb.nagadPublicKey || fromEnv.nagadPublicKey),
    callbackUrl: `${site}/api/payments/nagad/callback`,
    updatedAt: dbComplete ? updatedAt : null,
  }
}

export type NagadSettingsInput = {
  mode: NagadMode
  merchantId: string
  merchantNumber: string
  merchantPrivateKey: string
  nagadPublicKey: string
}

export async function buildNagadValueToStore(
  input: NagadSettingsInput,
): Promise<StoredNagadValue> {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  return {
    mode: input.mode,
    base_url: baseUrlForMode(input.mode),
    merchant_id: input.merchantId.trim(),
    merchant_number: input.merchantNumber.trim(),
    merchant_private_key:
      input.merchantPrivateKey.trim() ||
      fromDb.merchantPrivateKey ||
      fromEnv.merchantPrivateKey ||
      '',
    nagad_public_key:
      input.nagadPublicKey.trim() ||
      fromDb.nagadPublicKey ||
      fromEnv.nagadPublicKey ||
      '',
  }
}

export function storedNagadIsComplete(value: StoredNagadValue): boolean {
  return isComplete(storedToPartial(value))
}

export function configFromNagadInput(
  input: NagadSettingsInput,
  existing?: Partial<NagadConfig>,
): NagadConfig {
  const config: Partial<NagadConfig> = {
    mode: input.mode,
    baseUrl: baseUrlForMode(input.mode),
    merchantId: input.merchantId.trim(),
    merchantNumber: input.merchantNumber.trim(),
    merchantPrivateKey:
      input.merchantPrivateKey.trim() || existing?.merchantPrivateKey || '',
    nagadPublicKey:
      input.nagadPublicKey.trim() || existing?.nagadPublicKey || '',
  }
  if (!isComplete(config)) {
    throw new Error(
      'Fill all Nagad fields (or keep saved keys) before testing.',
    )
  }
  return config
}

export async function getExistingNagadSecrets(): Promise<
  Partial<NagadConfig>
> {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  return {
    merchantPrivateKey:
      fromDb.merchantPrivateKey || fromEnv.merchantPrivateKey,
    nagadPublicKey: fromDb.nagadPublicKey || fromEnv.nagadPublicKey,
  }
}
