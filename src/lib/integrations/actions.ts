'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/catalog/types'
import {
  BKASH_SETTINGS_KEY,
  buildBkashValueToStore,
  configFromBkashInput,
  getExistingBkashSecrets,
  storedBkashIsComplete,
  type BkashSettingsInput,
} from '@/lib/integrations/bkash-settings'
import {
  NAGAD_SETTINGS_KEY,
  buildNagadValueToStore,
  configFromNagadInput,
  getExistingNagadSecrets,
  storedNagadIsComplete,
  type NagadSettingsInput,
} from '@/lib/integrations/nagad-settings'
import {
  GTM_SETTINGS_KEY,
  META_PIXEL_SETTINGS_KEY,
  buildGtmValueToStore,
  buildMetaPixelValueToStore,
} from '@/lib/integrations/marketing-settings'
import {
  OMS_WEBHOOK_SETTINGS_KEY,
  DEFAULT_OMS_EVENTS,
  buildOmsWebhookValueToStore,
  type OmsWebhookEvent,
  type OmsWebhookSettingsInput,
} from '@/lib/integrations/oms-webhook-settings'
import {
  buildPathaoValueToStore,
  configFromInput,
  getExistingPathaoSecrets,
  PATHAO_SETTINGS_KEY,
  storedValueIsComplete,
  type PathaoSettingsInput,
} from '@/lib/integrations/pathao-settings'
import { grantBkashToken } from '@/lib/payments/bkash'
import { assertNagadKeysUsable } from '@/lib/payments/nagad'
import { getPathaoCities } from '@/lib/pathao'
import { createClient } from '@/lib/supabase/server'

function readInput(formData: FormData): PathaoSettingsInput {
  return {
    storeId: String(formData.get('storeId') ?? ''),
    clientId: String(formData.get('clientId') ?? ''),
    clientSecret: String(formData.get('clientSecret') ?? ''),
    username: String(formData.get('username') ?? ''),
    password: String(formData.get('password') ?? ''),
  }
}

function validateVisibleFields(input: PathaoSettingsInput): string | null {
  if (!input.storeId.trim()) return 'Store ID is required.'
  if (!/^\d+$/.test(input.storeId.trim())) {
    return 'Store ID must be a number (from Pathao merchant panel).'
  }
  if (!input.clientId.trim()) return 'Client ID is required.'
  if (!input.username.trim()) return 'Merchant email / username is required.'
  return null
}

export async function savePathaoSettings(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole('admin')
  const input = readInput(formData)
  const visibleError = validateVisibleFields(input)
  if (visibleError) return { ok: false, error: visibleError }

  const value = await buildPathaoValueToStore(input)
  if (!storedValueIsComplete(value)) {
    return {
      ok: false,
      error:
        'Client secret and password are required the first time. After that you can leave them blank to keep the saved values.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('integration_settings').upsert(
    {
      key: PATHAO_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )

  if (error) {
    console.error('[integrations] save pathao', error)
    return { ok: false, error: 'Could not save Pathao settings.' }
  }

  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function testPathaoSettings(
  formData: FormData,
): Promise<ActionResult<{ cities: number }>> {
  await requireRole('admin')
  const input = readInput(formData)
  const visibleError = validateVisibleFields(input)
  if (visibleError) return { ok: false, error: visibleError }

  try {
    const existing = await getExistingPathaoSecrets()
    const config = configFromInput(input, existing)
    const cities = await getPathaoCities(config)
    return { ok: true, data: { cities: cities.length } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

function readBkashInput(formData: FormData): BkashSettingsInput {
  const modeRaw = String(formData.get('mode') ?? 'sandbox')
  return {
    mode: modeRaw === 'production' ? 'production' : 'sandbox',
    appKey: String(formData.get('appKey') ?? ''),
    appSecret: String(formData.get('appSecret') ?? ''),
    username: String(formData.get('username') ?? ''),
    password: String(formData.get('password') ?? ''),
  }
}

export async function saveBkashSettings(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole('admin')
  const input = readBkashInput(formData)
  if (!input.username.trim()) {
    return { ok: false, error: 'Username is required.' }
  }

  const value = await buildBkashValueToStore(input)
  if (!storedBkashIsComplete(value)) {
    return {
      ok: false,
      error:
        'App key, app secret, and password are required the first time. After that leave blanks to keep saved values.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('integration_settings').upsert(
    {
      key: BKASH_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )
  if (error) {
    console.error('[integrations] save bkash', error)
    return { ok: false, error: 'Could not save bKash settings.' }
  }
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function testBkashSettings(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole('admin')
  const input = readBkashInput(formData)
  try {
    const existing = await getExistingBkashSecrets()
    const config = configFromBkashInput(input, existing)
    await grantBkashToken(config)
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

function readNagadInput(formData: FormData): NagadSettingsInput {
  const modeRaw = String(formData.get('mode') ?? 'sandbox')
  return {
    mode: modeRaw === 'production' ? 'production' : 'sandbox',
    merchantId: String(formData.get('merchantId') ?? ''),
    merchantNumber: String(formData.get('merchantNumber') ?? ''),
    merchantPrivateKey: String(formData.get('merchantPrivateKey') ?? ''),
    nagadPublicKey: String(formData.get('nagadPublicKey') ?? ''),
  }
}

export async function saveNagadSettings(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole('admin')
  const input = readNagadInput(formData)
  if (!input.merchantId.trim()) {
    return { ok: false, error: 'Merchant ID is required.' }
  }
  if (!input.merchantNumber.trim()) {
    return { ok: false, error: 'Merchant number is required.' }
  }

  const value = await buildNagadValueToStore(input)
  if (!storedNagadIsComplete(value)) {
    return {
      ok: false,
      error:
        'Merchant private key and Nagad public key are required the first time. After that leave blanks to keep saved values.',
    }
  }

  try {
    assertNagadKeysUsable(configFromNagadInput(input, {
      merchantPrivateKey: value.merchant_private_key,
      nagadPublicKey: value.nagad_public_key,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `Invalid RSA keys: ${message}` }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('integration_settings').upsert(
    {
      key: NAGAD_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )
  if (error) {
    console.error('[integrations] save nagad', error)
    return { ok: false, error: 'Could not save Nagad settings.' }
  }
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function testNagadSettings(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole('admin')
  const input = readNagadInput(formData)
  try {
    const existing = await getExistingNagadSecrets()
    const config = configFromNagadInput(input, existing)
    assertNagadKeysUsable(config)
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

export async function saveGtmSettings(formData: FormData): Promise<ActionResult> {
  const session = await requireRole('admin')
  const enabled = String(formData.get('enabled') ?? '') === '1'
  const containerId = String(formData.get('containerId') ?? '')
  if (enabled && !containerId.trim()) {
    return { ok: false, error: 'Container ID is required when GTM is enabled.' }
  }

  const value = buildGtmValueToStore({ enabled, containerId })
  const supabase = await createClient()
  const { error } = await supabase.from('integration_settings').upsert(
    {
      key: GTM_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )
  if (error) {
    console.error('[integrations] save gtm', error)
    return { ok: false, error: 'Could not save GTM settings.' }
  }
  revalidatePath('/admin/integrations')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function saveMetaPixelSettings(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole('admin')
  const enabled = String(formData.get('enabled') ?? '') === '1'
  const pixelId = String(formData.get('pixelId') ?? '')
  const preferGtm = String(formData.get('preferGtm') ?? '1') === '1'
  if (enabled && !pixelId.trim()) {
    return { ok: false, error: 'Pixel ID is required when Meta Pixel is enabled.' }
  }

  const value = buildMetaPixelValueToStore({ enabled, pixelId, preferGtm })
  const supabase = await createClient()
  const { error } = await supabase.from('integration_settings').upsert(
    {
      key: META_PIXEL_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )
  if (error) {
    console.error('[integrations] save meta', error)
    return { ok: false, error: 'Could not save Meta Pixel settings.' }
  }
  revalidatePath('/admin/integrations')
  revalidatePath('/', 'layout')
  return { ok: true }
}

function readOmsInput(formData: FormData): OmsWebhookSettingsInput {
  const events = { ...DEFAULT_OMS_EVENTS }
  for (const key of Object.keys(DEFAULT_OMS_EVENTS) as OmsWebhookEvent[]) {
    events[key] = String(formData.get(`event_${key}`) ?? '') === '1'
  }
  return {
    enabled: String(formData.get('enabled') ?? '') === '1',
    endpointUrl: String(formData.get('endpointUrl') ?? ''),
    apiKey: String(formData.get('apiKey') ?? ''),
    events,
  }
}

export async function saveOmsWebhookSettings(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole('admin')
  const input = readOmsInput(formData)
  if (input.enabled && input.endpointUrl.trim()) {
    try {
      // Allow empty URL for stub mode; validate only when non-empty.
      // eslint-disable-next-line no-new
      new URL(input.endpointUrl.trim())
    } catch {
      return { ok: false, error: 'Endpoint URL must be a valid URL.' }
    }
  }

  const value = await buildOmsWebhookValueToStore(input)
  const supabase = await createClient()
  const { error } = await supabase.from('integration_settings').upsert(
    {
      key: OMS_WEBHOOK_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )
  if (error) {
    console.error('[integrations] save oms', error)
    return { ok: false, error: 'Could not save webhook settings.' }
  }
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function testOmsWebhook(
  formData: FormData,
): Promise<ActionResult<{ mode: string }>> {
  const session = await requireRole('admin')
  const input = readOmsInput(formData)
  const value = await buildOmsWebhookValueToStore({
    ...input,
    enabled: true,
  })
  const supabase = await createClient()
  await supabase.from('integration_settings').upsert(
    {
      key: OMS_WEBHOOK_SETTINGS_KEY,
      value: value as unknown as import('@/lib/supabase/database.types').Json,
      updated_by: session.userId,
    },
    { onConflict: 'key' },
  )

  // Bypass request-cached resolver after write
  const endpointUrl = (value.endpoint_url || '').trim()
  const apiKey = (value.api_key || '').trim() || null
  const payload = {
    event: 'order.created' as const,
    occurredAt: new Date().toISOString(),
    order: {
      id: '00000000-0000-0000-0000-000000000000',
      orderNumber: 'TEST-WEBHOOK',
      status: 'awaiting_fulfillment',
      paymentMethod: 'cod',
      total: 1000,
      currency: 'BDT' as const,
      customer: {
        fullName: 'Viable Test',
        phone: '01700000000',
        email: null,
      },
      shipping: {
        cityName: 'Dhaka',
        address: 'Test address',
      },
    },
  }

  if (!endpointUrl) {
    console.info('[oms-webhook] stub', JSON.stringify(payload))
    revalidatePath('/admin/integrations')
    return { ok: true, data: { mode: 'stub' } }
  }

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'X-Viable-Event': 'order.created',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { ok: false, error: `Partner returned HTTP ${res.status}.` }
    }
    revalidatePath('/admin/integrations')
    return { ok: true, data: { mode: 'sent' } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}
