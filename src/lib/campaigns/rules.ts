import type { Json } from '@/lib/supabase/database.types'

export type CampaignRuleType =
  | 'free_shipping_min_subtotal'
  | 'delivery_percent_off'
  | 'delivery_fixed'

export type CampaignRules = {
  type: CampaignRuleType
  /** For free_shipping_min_subtotal */
  min_subtotal?: number
  /** For delivery_percent_off (0–100) */
  percent_off?: number
  /** For delivery_fixed — customer delivery before COD inflate */
  fixed_delivery?: number
  /** Optional Pathao city_id allow list (empty = all) */
  city_ids_allow?: number[]
  /** Optional Pathao city_id deny list */
  city_ids_deny?: number[]
}

export type CampaignRow = {
  id: string
  name: string
  priority: number
  active: boolean
  starts_at: string | null
  ends_at: string | null
  rules: Json
}

export type CampaignMatch = {
  campaignId: string
  campaignName: string
  ruleType: CampaignRuleType
  pathaoDeliveryFee: number
  adjustedDeliveryFee: number
  discountAmount: number
}

export function parseCampaignRules(raw: Json): CampaignRules | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const type = row.type
  if (
    type !== 'free_shipping_min_subtotal' &&
    type !== 'delivery_percent_off' &&
    type !== 'delivery_fixed'
  ) {
    return null
  }
  return {
    type,
    min_subtotal:
      typeof row.min_subtotal === 'number' ? row.min_subtotal : undefined,
    percent_off:
      typeof row.percent_off === 'number' ? row.percent_off : undefined,
    fixed_delivery:
      typeof row.fixed_delivery === 'number' ? row.fixed_delivery : undefined,
    city_ids_allow: Array.isArray(row.city_ids_allow)
      ? row.city_ids_allow.filter((n): n is number => typeof n === 'number')
      : undefined,
    city_ids_deny: Array.isArray(row.city_ids_deny)
      ? row.city_ids_deny.filter((n): n is number => typeof n === 'number')
      : undefined,
  }
}

function cityAllowed(rules: CampaignRules, cityId: number | null): boolean {
  if (cityId == null) return true
  if (rules.city_ids_deny?.includes(cityId)) return false
  if (rules.city_ids_allow && rules.city_ids_allow.length > 0) {
    return rules.city_ids_allow.includes(cityId)
  }
  return true
}

function isInDateWindow(
  now: Date,
  startsAt: string | null,
  endsAt: string | null,
): boolean {
  if (startsAt && new Date(startsAt) > now) return false
  if (endsAt && new Date(endsAt) < now) return false
  return true
}

function applyRuleToDelivery(
  rules: CampaignRules,
  subtotal: number,
  pathaoDeliveryFee: number,
): number | null {
  const base = Math.max(0, pathaoDeliveryFee)
  switch (rules.type) {
    case 'free_shipping_min_subtotal': {
      const min = rules.min_subtotal ?? 0
      if (subtotal < min) return null
      return 0
    }
    case 'delivery_percent_off': {
      const pct = Math.min(100, Math.max(0, rules.percent_off ?? 0))
      return Math.max(0, base * (1 - pct / 100))
    }
    case 'delivery_fixed': {
      return Math.max(0, rules.fixed_delivery ?? 0)
    }
    default:
      return null
  }
}

/**
 * Highest priority active campaign that matches wins.
 * Applied to Pathao delivery fee before COD inflate + ceil.
 */
export function pickCampaignDelivery(
  campaigns: CampaignRow[],
  opts: {
    subtotal: number
    pathaoDeliveryFee: number
    cityId: number | null
    now?: Date
  },
): CampaignMatch | null {
  const now = opts.now ?? new Date()
  const sorted = [...campaigns]
    .filter((c) => c.active)
    .filter((c) => isInDateWindow(now, c.starts_at, c.ends_at))
    .sort((a, b) => b.priority - a.priority)

  for (const campaign of sorted) {
    const rules = parseCampaignRules(campaign.rules)
    if (!rules) continue
    if (!cityAllowed(rules, opts.cityId)) continue
    const adjusted = applyRuleToDelivery(
      rules,
      opts.subtotal,
      opts.pathaoDeliveryFee,
    )
    if (adjusted == null) continue
    const pathao = Math.max(0, opts.pathaoDeliveryFee)
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      ruleType: rules.type,
      pathaoDeliveryFee: pathao,
      adjustedDeliveryFee: adjusted,
      discountAmount: Math.max(0, pathao - adjusted),
    }
  }
  return null
}

export function ruleTypeLabel(type: CampaignRuleType): string {
  switch (type) {
    case 'free_shipping_min_subtotal':
      return 'Free shipping over amount'
    case 'delivery_percent_off':
      return 'Percent off delivery'
    case 'delivery_fixed':
      return 'Fixed delivery charge'
  }
}
