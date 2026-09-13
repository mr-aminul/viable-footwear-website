import { createServiceClient } from '@/lib/supabase/admin'
import type { CampaignRow } from '@/lib/campaigns/rules'

export async function listActiveCampaignsForCheckout(): Promise<CampaignRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, priority, active, starts_at, ends_at, rules')
    .eq('active', true)
    .order('priority', { ascending: false })

  if (error || !data) {
    console.error('[campaigns] list active', error)
    return []
  }
  return data
}

export async function listCampaignsAdmin(): Promise<
  Array<CampaignRow & { created_at: string; updated_at: string }>
> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select(
      'id, name, priority, active, starts_at, ends_at, rules, created_at, updated_at',
    )
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[campaigns] list admin', error)
    return []
  }
  return data
}

export async function getCampaignById(
  id: string,
): Promise<(CampaignRow & { created_at: string; updated_at: string }) | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select(
      'id, name, priority, active, starts_at, ends_at, rules, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data
}
