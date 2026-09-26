import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/admin'
import {
  pickAnnouncementCampaign,
  type CampaignRow,
} from '@/lib/campaigns/rules'
import { getSiteContent } from '@/lib/website/queries'

export const CAMPAIGNS_ANNOUNCEMENT_TAG = 'campaigns-announcement'

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

async function fetchAnnouncementCampaign(): Promise<CampaignRow | null> {
  try {
    const campaigns = await listActiveCampaignsForCheckout()
    return pickAnnouncementCampaign(campaigns)
  } catch (error) {
    console.error('[campaigns] announcement', error)
    return null
  }
}

const getAnnouncementCached = unstable_cache(
  async (): Promise<string | null> => {
    const [campaign, site] = await Promise.all([
      fetchAnnouncementCampaign(),
      getSiteContent(),
    ])
    if (!campaign?.name.trim()) return null
    return `${campaign.name.trim()} · WhatsApp ${site.brand.phone}`
  },
  ['campaigns-announcement'],
  { tags: [CAMPAIGNS_ANNOUNCEMENT_TAG], revalidate: 60 },
)

/** Storefront top ribbon copy from the highest-priority live campaign. */
export const getStorefrontAnnouncement = cache(
  async (): Promise<string | null> => getAnnouncementCached(),
)

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
