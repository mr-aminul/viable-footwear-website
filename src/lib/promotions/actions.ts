'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/catalog/types'
import {
  normalizePromoCode,
  type PromoDiscountType,
} from '@/lib/promotions/rules'
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

function parseProductIds(formData: FormData): string[] {
  const raw = readString(formData, 'product_ids')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return [
      ...new Set(
        parsed
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ]
  } catch {
    return raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
}

function parsePayload(formData: FormData):
  | {
      title: string
      code: string
      description: string
      active: boolean
      starts_at: string | null
      ends_at: string | null
      discount_type: PromoDiscountType
      discount_value: number
      product_ids: string[]
    }
  | { error: string } {
  const title = readString(formData, 'title')
  if (!title) return { error: 'Title is required.' }

  const code = normalizePromoCode(readString(formData, 'code'))
  if (!code) return { error: 'Promo code is required.' }
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    return {
      error:
        'Promo code must be 2–32 characters (letters, numbers, _ or -).',
    }
  }

  const description = readString(formData, 'description')
  const active =
    formData.get('active') === 'on' || formData.get('active') === 'true'

  const neverExpires =
    formData.get('never_expires') === 'on' ||
    formData.get('never_expires') === 'true'
  const startsAt = readString(formData, 'starts_at') || null
  const endsAt = neverExpires ? null : readString(formData, 'ends_at') || null

  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
    return { error: 'End date must be after the start date.' }
  }

  const discountType = readString(formData, 'discount_type') as PromoDiscountType
  if (discountType !== 'percent' && discountType !== 'flat') {
    return { error: 'Choose flat or percent discount.' }
  }

  const discountValue = readNumber(formData, 'discount_value')
  if (discountValue == null || discountValue <= 0) {
    return { error: 'Discount value must be greater than zero.' }
  }
  if (discountType === 'percent' && discountValue > 100) {
    return { error: 'Percent discount cannot exceed 100.' }
  }

  const productIds = parseProductIds(formData)
  if (productIds.length === 0) {
    return { error: 'Select at least one product for this promo.' }
  }

  return {
    title,
    code,
    description,
    active,
    starts_at: startsAt,
    ends_at: endsAt,
    discount_type: discountType,
    discount_value: discountValue,
    product_ids: productIds,
  }
}

function revalidatePromotions(id?: string) {
  revalidatePath('/admin/promotions')
  if (id) revalidatePath(`/admin/promotions/${id}`)
}

export async function createPromotion(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['admin', 'manager'])
  const payload = parsePayload(formData)
  if ('error' in payload) return { ok: false, error: payload.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That promo code already exists.' }
    }
    return { ok: false, error: error.message }
  }

  revalidatePromotions()
  return { ok: true, data: { id: data.id } }
}

export async function updatePromotion(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const payload = parsePayload(formData)
  if ('error' in payload) return { ok: false, error: payload.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('promo_codes')
    .update(payload)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That promo code already exists.' }
    }
    return { ok: false, error: error.message }
  }

  revalidatePromotions(id)
  return { ok: true }
}

export async function setPromotionActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const { error } = await supabase
    .from('promo_codes')
    .update({ active })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePromotions(id)
  return { ok: true }
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const { error } = await supabase.from('promo_codes').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePromotions()
  return { ok: true }
}
