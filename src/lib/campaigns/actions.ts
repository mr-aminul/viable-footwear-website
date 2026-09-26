'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { CAMPAIGNS_ANNOUNCEMENT_TAG } from '@/lib/campaigns/queries'
import type { CampaignRuleType, CampaignRules } from '@/lib/campaigns/rules'
import type { ActionResult } from '@/lib/catalog/types'
import type { Json } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function readNumber(formData: FormData, key: string): number | null {
  const raw = readString(formData, key)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseCityIds(raw: string): number[] {
  if (!raw.trim()) return []
  return raw
    .split(/[\s,]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function buildRules(formData: FormData): CampaignRules | { error: string } {
  const type = readString(formData, 'rule_type') as CampaignRuleType
  if (
    type !== 'free_shipping_min_subtotal' &&
    type !== 'delivery_percent_off' &&
    type !== 'delivery_fixed'
  ) {
    return { error: 'Choose a valid rule type.' }
  }

  const city_ids_allow = parseCityIds(readString(formData, 'city_ids_allow'))
  const city_ids_deny = parseCityIds(readString(formData, 'city_ids_deny'))

  const base = {
    type,
    ...(city_ids_allow.length ? { city_ids_allow } : {}),
    ...(city_ids_deny.length ? { city_ids_deny } : {}),
  }

  if (type === 'free_shipping_min_subtotal') {
    const min = readNumber(formData, 'min_subtotal')
    if (min == null || min < 0) {
      return { error: 'Min subtotal is required (৳).' }
    }
    return { ...base, min_subtotal: min }
  }

  if (type === 'delivery_percent_off') {
    const percent = readNumber(formData, 'percent_off')
    if (percent == null || percent < 0 || percent > 100) {
      return { error: 'Percent off must be between 0 and 100.' }
    }
    return { ...base, percent_off: percent }
  }

  const fixed = readNumber(formData, 'fixed_delivery')
  if (fixed == null || fixed < 0) {
    return { error: 'Fixed delivery amount is required (৳).' }
  }
  return { ...base, fixed_delivery: fixed }
}

function revalidateCampaigns() {
  revalidateTag(CAMPAIGNS_ANNOUNCEMENT_TAG)
  revalidatePath('/admin/campaigns')
  revalidatePath('/', 'layout')
}

export async function createCampaign(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['admin', 'manager'])
  const name = readString(formData, 'name')
  if (!name) return { ok: false, error: 'Name is required.' }

  const priority = readNumber(formData, 'priority') ?? 0
  const active =
    formData.get('active') === 'on' || formData.get('active') === 'true'
  const startsAt = readString(formData, 'starts_at') || null
  const endsAt = readString(formData, 'ends_at') || null
  const rules = buildRules(formData)
  if ('error' in rules) return { ok: false, error: rules.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name,
      priority,
      active,
      starts_at: startsAt,
      ends_at: endsAt,
      rules: rules as unknown as Json,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidateCampaigns()
  return { ok: true, data: { id: data.id } }
}

export async function updateCampaign(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const name = readString(formData, 'name')
  if (!name) return { ok: false, error: 'Name is required.' }

  const priority = readNumber(formData, 'priority') ?? 0
  const active =
    formData.get('active') === 'on' || formData.get('active') === 'true'
  const startsAt = readString(formData, 'starts_at') || null
  const endsAt = readString(formData, 'ends_at') || null
  const rules = buildRules(formData)
  if ('error' in rules) return { ok: false, error: rules.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('campaigns')
    .update({
      name,
      priority,
      active,
      starts_at: startsAt,
      ends_at: endsAt,
      rules: rules as unknown as Json,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidateCampaigns()
  revalidatePath(`/admin/campaigns/${id}`)
  return { ok: true }
}

export async function setCampaignActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const { error } = await supabase
    .from('campaigns')
    .update({ active })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidateCampaigns()
  return { ok: true }
}
