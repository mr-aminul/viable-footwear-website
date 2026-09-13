import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/admin'

export const PATHAO_SETTINGS_KEY = 'pathao'
export const PATHAO_PRODUCTION_URL = 'https://api-hermes.pathao.com'

export type PathaoConfig = {
  baseUrl: string
  clientId: string
  clientSecret: string
  username: string
  password: string
  storeId: string
}

/** Safe shape for Admin UI — never includes raw secrets. */
export type PathaoSettingsView = {
  configured: boolean
  source: 'admin' | 'env' | 'none'
  storeId: string
  clientId: string
  username: string
  hasClientSecret: boolean
  hasPassword: boolean
  updatedAt: string | null
}

type StoredPathaoValue = {
  mode?: 'production' | 'sandbox'
  base_url?: string
  client_id?: string
  client_secret?: string
  username?: string
  password?: string
  store_id?: string
}

function readEnvConfig(): Partial<PathaoConfig> {
  return {
    baseUrl: PATHAO_PRODUCTION_URL,
    clientId: process.env.PATHAO_CLIENT_ID?.trim() || undefined,
    clientSecret: process.env.PATHAO_CLIENT_SECRET?.trim() || undefined,
    username: process.env.PATHAO_USERNAME?.trim() || undefined,
    password: process.env.PATHAO_PASSWORD?.trim() || undefined,
    storeId: process.env.PATHAO_STORE_ID?.trim() || undefined,
  }
}

function isComplete(config: Partial<PathaoConfig>): config is PathaoConfig {
  return Boolean(
    config.baseUrl &&
      config.clientId &&
      config.clientSecret &&
      config.username &&
      config.password &&
      config.storeId,
  )
}

async function readStoredValue(): Promise<{
  value: StoredPathaoValue | null
  updatedAt: string | null
}> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('integration_settings')
      .select('value, updated_at')
      .eq('key', PATHAO_SETTINGS_KEY)
      .maybeSingle()

    if (error || !data) return { value: null, updatedAt: null }
    const value =
      data.value && typeof data.value === 'object' && !Array.isArray(data.value)
        ? (data.value as StoredPathaoValue)
        : null
    return { value, updatedAt: data.updated_at ?? null }
  } catch {
    return { value: null, updatedAt: null }
  }
}

function storedToPartial(value: StoredPathaoValue | null): Partial<PathaoConfig> {
  if (!value) return {}
  return {
    // Always production — sandbox is not offered in Admin.
    baseUrl: PATHAO_PRODUCTION_URL,
    clientId: value.client_id?.trim() || undefined,
    clientSecret: value.client_secret?.trim() || undefined,
    username: value.username?.trim() || undefined,
    password: value.password?.trim() || undefined,
    storeId: value.store_id?.trim() || undefined,
  }
}

/**
 * Resolve Pathao credentials: Admin Integrations DB first, then env fallback.
 * Cached per request. Always uses production API.
 */
export const resolvePathaoConfig = cache(async (): Promise<PathaoConfig> => {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  if (isComplete(fromDb)) return fromDb

  const fromEnv = readEnvConfig()
  const merged: Partial<PathaoConfig> = {
    baseUrl: PATHAO_PRODUCTION_URL,
    clientId: fromDb.clientId || fromEnv.clientId,
    clientSecret: fromDb.clientSecret || fromEnv.clientSecret,
    username: fromDb.username || fromEnv.username,
    password: fromDb.password || fromEnv.password,
    storeId: fromDb.storeId || fromEnv.storeId,
  }

  if (!isComplete(merged)) {
    throw new Error(
      'Pathao is not configured. Open Admin → Integrations and save your Pathao credentials.',
    )
  }
  return merged
})

export async function getPathaoSettingsView(): Promise<PathaoSettingsView> {
  const { value, updatedAt } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()

  const dbComplete = isComplete(fromDb)
  const envComplete = isComplete({
    baseUrl: PATHAO_PRODUCTION_URL,
    clientId: fromEnv.clientId,
    clientSecret: fromEnv.clientSecret,
    username: fromEnv.username,
    password: fromEnv.password,
    storeId: fromEnv.storeId,
  })

  const source: PathaoSettingsView['source'] = dbComplete
    ? 'admin'
    : envComplete
      ? 'env'
      : 'none'

  return {
    configured: source !== 'none',
    source,
    storeId: fromDb.storeId || fromEnv.storeId || '',
    clientId: fromDb.clientId || fromEnv.clientId || '',
    username: fromDb.username || fromEnv.username || '',
    hasClientSecret: Boolean(fromDb.clientSecret || fromEnv.clientSecret),
    hasPassword: Boolean(fromDb.password || fromEnv.password),
    updatedAt: dbComplete ? updatedAt : null,
  }
}

export type PathaoSettingsInput = {
  storeId: string
  clientId: string
  clientSecret: string
  username: string
  password: string
}

/**
 * Merge form input with existing DB/env secrets (blank secret fields keep previous).
 */
export async function buildPathaoValueToStore(
  input: PathaoSettingsInput,
): Promise<StoredPathaoValue> {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()

  const clientSecret =
    input.clientSecret.trim() ||
    fromDb.clientSecret ||
    fromEnv.clientSecret ||
    ''
  const password =
    input.password.trim() || fromDb.password || fromEnv.password || ''

  return {
    mode: 'production',
    base_url: PATHAO_PRODUCTION_URL,
    store_id: input.storeId.trim(),
    client_id: input.clientId.trim(),
    client_secret: clientSecret,
    username: input.username.trim(),
    password,
  }
}

export function storedValueIsComplete(value: StoredPathaoValue): boolean {
  return isComplete(storedToPartial(value))
}

/** Test credentials without persisting (for Admin “Test connection”). */
export function configFromInput(
  input: PathaoSettingsInput,
  existing?: Partial<PathaoConfig>,
): PathaoConfig {
  const clientSecret =
    input.clientSecret.trim() || existing?.clientSecret || ''
  const password = input.password.trim() || existing?.password || ''
  const config: Partial<PathaoConfig> = {
    baseUrl: PATHAO_PRODUCTION_URL,
    storeId: input.storeId.trim(),
    clientId: input.clientId.trim(),
    clientSecret,
    username: input.username.trim(),
    password,
  }
  if (!isComplete(config)) {
    throw new Error(
      'Fill all Pathao fields (or keep saved secrets) before testing.',
    )
  }
  return config
}

export async function getExistingPathaoSecrets(): Promise<Partial<PathaoConfig>> {
  const { value } = await readStoredValue()
  const fromDb = storedToPartial(value)
  const fromEnv = readEnvConfig()
  return {
    clientSecret: fromDb.clientSecret || fromEnv.clientSecret,
    password: fromDb.password || fromEnv.password,
  }
}
