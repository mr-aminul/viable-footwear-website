import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/admin'

export const BKASH_SETTINGS_KEY = 'bkash'

export const BKASH_SANDBOX_BASE =
  'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized'
export const BKASH_PRODUCTION_BASE =
  'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized'

export type BkashMode = 'sandbox' | 'production'

export type BkashConfig = {
  mode: BkashMode
  baseUrl: string
  appKey: string
  appSecret: string
  username: string
  password: string
}

export type BkashSettingsView = {
  configured: boolean
  source: 'admin' | 'env' | 'none'
  mode: BkashMode
  username: string
  hasAppKey: boolean
  hasAppSecret: boolean
  hasPassword: boolean
  callbackUrl: string
  updatedAt: string | null
}

type StoredBkashValue = {
  mode?: BkashMode
  base_url?: string
  app_key?: string
  app_secret?: string
  username?: string
  password?: string
}

function baseUrlForMode(mode: BkashMode): string {
  return mode === 'production' ? BKASH_PRODUCTION_BASE : BKASH_SANDBOX_BASE
}

function readEnvConfig(): Partial<BkashConfig> {
  const mode: BkashMode =
    process.env.BKASH_MODE?.trim() === 'production' ? 'production' : 'sandbox'
  return {
    mode,
    baseUrl: process.env.BKASH_BASE_URL?.trim() || baseUrlForMode(mode),
    appKey: process.env.BKASH_APP_KEY?.trim() || undefined,
    appSecret: process.env.BKASH_APP_SECRET?.trim() || undefined,
    username: process.env.BKASH_USERNAME?.trim() || undefined,
    password: process.env.BKASH_PASSWORD?.trim() || undefined,
  }
}

function isComplete(config: Partial<BkashConfig>): config is BkashConfig {
  return Boolean(
    config.mode &&
      config.baseUrl &&
      config.appKey &&
      config.appSecret &&
      config.username &&
      config.password,
  )
}

async function readStoredValue(): Promise<{
  value: StoredBkashValue | null
  updatedAt: string | null
}> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('integration_settings')
      .select('value, updated_at')
      .eq('key', BKASH_SETTINGS_KEY)
      .maybeSingle()
    if (error || !data) return { value: null, updatedAt: null }
    const value =
      data.value && typeof data.value === 'object' && !Array.isArray(data.value)
        ? (data.value as StoredBkashValue)
        : null
    return { value, updatedAt: data.updated_at ?? null }
  } catch {
    return { value: null, updatedAt: null }
  }
}

function storedToPartial(value: StoredBkashValue | null): Partial<BkashConfig> {
  if (!value) return {}
  const mode: BkashMode =
    value.mode === 'production' ? 'production' : 'sandbox'
  return {
    mode,
    baseUrl: value.base_url?.trim() || baseUrlForMode(mode),
    appKey: value.app_key?.trim() || undefined,
    appSecret: value.app_secret?.trim() || undefined,
    username: value.username?.trim() || undefined,
    password: value.password?.trim() || undefined,
  }
}

export const resolveBkashConfig = cache(async (): Promise<BkashConfig> => {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  if (isComplete(fromDb)) return fromDb

  const fromEnv = readEnvConfig()
  const mode = fromDb.mode || fromEnv.mode || 'sandbox'
  const merged: Partial<BkashConfig> = {
    mode,
    baseUrl: fromDb.baseUrl || fromEnv.baseUrl || baseUrlForMode(mode),
    appKey: fromDb.appKey || fromEnv.appKey,
    appSecret: fromDb.appSecret || fromEnv.appSecret,
    username: fromDb.username || fromEnv.username,
    password: fromDb.password || fromEnv.password,
  }
  if (!isComplete(merged)) {
    throw new Error(
      'bKash is not configured. Open Admin → Integrations and save credentials.',
    )
  }
  return merged
})

export async function isBkashConfigured(): Promise<boolean> {
  try {
    await resolveBkashConfig()
    return true
  } catch {
    return false
  }
}

export async function getBkashSettingsView(): Promise<BkashSettingsView> {
  const { value, updatedAt } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'

  const dbComplete = isComplete(fromDb)
  const envComplete = isComplete({
    mode: fromEnv.mode || 'sandbox',
    baseUrl: fromEnv.baseUrl || BKASH_SANDBOX_BASE,
    appKey: fromEnv.appKey,
    appSecret: fromEnv.appSecret,
    username: fromEnv.username,
    password: fromEnv.password,
  })

  const source: BkashSettingsView['source'] = dbComplete
    ? 'admin'
    : envComplete
      ? 'env'
      : 'none'

  return {
    configured: source !== 'none',
    source,
    mode: fromDb.mode || fromEnv.mode || 'sandbox',
    username: fromDb.username || fromEnv.username || '',
    hasAppKey: Boolean(fromDb.appKey || fromEnv.appKey),
    hasAppSecret: Boolean(fromDb.appSecret || fromEnv.appSecret),
    hasPassword: Boolean(fromDb.password || fromEnv.password),
    callbackUrl: `${site}/api/payments/bkash/callback`,
    updatedAt: dbComplete ? updatedAt : null,
  }
}

export type BkashSettingsInput = {
  mode: BkashMode
  appKey: string
  appSecret: string
  username: string
  password: string
}

export async function buildBkashValueToStore(
  input: BkashSettingsInput,
): Promise<StoredBkashValue> {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  return {
    mode: input.mode,
    base_url: baseUrlForMode(input.mode),
    app_key: input.appKey.trim() || fromDb.appKey || fromEnv.appKey || '',
    app_secret:
      input.appSecret.trim() || fromDb.appSecret || fromEnv.appSecret || '',
    username: input.username.trim(),
    password: input.password.trim() || fromDb.password || fromEnv.password || '',
  }
}

export function storedBkashIsComplete(value: StoredBkashValue): boolean {
  return isComplete(storedToPartial(value))
}

export function configFromBkashInput(
  input: BkashSettingsInput,
  existing?: Partial<BkashConfig>,
): BkashConfig {
  const config: Partial<BkashConfig> = {
    mode: input.mode,
    baseUrl: baseUrlForMode(input.mode),
    appKey: input.appKey.trim() || existing?.appKey || '',
    appSecret: input.appSecret.trim() || existing?.appSecret || '',
    username: input.username.trim(),
    password: input.password.trim() || existing?.password || '',
  }
  if (!isComplete(config)) {
    throw new Error('Fill all bKash fields (or keep saved secrets) before testing.')
  }
  return config
}

export async function getExistingBkashSecrets(): Promise<Partial<BkashConfig>> {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  return {
    appKey: fromDb.appKey || fromEnv.appKey,
    appSecret: fromDb.appSecret || fromEnv.appSecret,
    password: fromDb.password || fromEnv.password,
  }
}
