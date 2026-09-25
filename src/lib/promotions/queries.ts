import { createServiceClient } from '@/lib/supabase/admin'
import {
  computePromoDiscount,
  isPromoInDateWindow,
  normalizePromoCode,
  type PromoApplyResult,
  type PromoCartLine,
  type PromoCodeRow,
  type PromoDiscountType,
} from '@/lib/promotions/rules'

function mapPromoRow(row: {
  id: string
  title: string
  code: string
  description: string
  active: boolean
  starts_at: string | null
  ends_at: string | null
  discount_type: string
  discount_value: number
  product_ids: string[] | null
}): PromoCodeRow {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    description: row.description ?? '',
    active: row.active,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    discount_type: row.discount_type as PromoDiscountType,
    discount_value: Number(row.discount_value),
    product_ids: row.product_ids ?? [],
  }
}

const PROMO_SELECT =
  'id, title, code, description, active, starts_at, ends_at, discount_type, discount_value, product_ids'

export async function listPromotionsAdmin(): Promise<
  Array<PromoCodeRow & { created_at: string; updated_at: string }>
> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select(`${PROMO_SELECT}, created_at, updated_at`)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[promotions] list admin', error)
    return []
  }
  return data.map((row) => ({
    ...mapPromoRow(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function getPromotionById(
  id: string,
): Promise<(PromoCodeRow & { created_at: string; updated_at: string }) | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select(`${PROMO_SELECT}, created_at, updated_at`)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return {
    ...mapPromoRow(data),
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export async function getActivePromoByCode(
  rawCode: string,
  now: Date = new Date(),
): Promise<PromoCodeRow | null> {
  const code = normalizePromoCode(rawCode)
  if (!code) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select(PROMO_SELECT)
    .eq('code', code)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[promotions] get by code', error)
    return null
  }

  const promo = mapPromoRow(data)
  if (!isPromoInDateWindow(now, promo.starts_at, promo.ends_at)) return null
  return promo
}

/**
 * Resolve and apply a promo against authenticated cart line prices.
 * Returns null when no code was provided; error object when invalid.
 */
export async function resolvePromoForCheckout(opts: {
  code: string | null | undefined
  lines: PromoCartLine[]
  now?: Date
}): Promise<
  | { ok: true; applied: PromoApplyResult | null }
  | { ok: false; error: string }
> {
  const raw = String(opts.code ?? '').trim()
  if (!raw) return { ok: true, applied: null }

  const promo = await getActivePromoByCode(raw, opts.now)
  if (!promo) {
    return { ok: false, error: 'This promo code is invalid or expired.' }
  }

  const result = computePromoDiscount(promo, opts.lines)
  if ('error' in result) return { ok: false, error: result.error }
  return { ok: true, applied: result }
}
