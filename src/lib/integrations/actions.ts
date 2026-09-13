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
  buildPathaoValueToStore,
  configFromInput,
  getExistingPathaoSecrets,
  PATHAO_SETTINGS_KEY,
  storedValueIsComplete,
  type PathaoSettingsInput,
} from '@/lib/integrations/pathao-settings'
import { grantBkashToken } from '@/lib/payments/bkash'
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
