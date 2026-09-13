import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/admin'

export const GTM_SETTINGS_KEY = 'gtm'
export const META_PIXEL_SETTINGS_KEY = 'meta_pixel'

export type GtmSettingsView = {
  enabled: boolean
  containerId: string
  updatedAt: string | null
}

export type MetaPixelSettingsView = {
  enabled: boolean
  pixelId: string
  /** Prefer loading Pixel through GTM instead of a direct script. */
  preferGtm: boolean
  updatedAt: string | null
}

/** Safe public flags for storefront script injection (no secrets). */
export type PublicMarketingConfig = {
  gtm: { enabled: boolean; containerId: string | null }
  meta: {
    enabled: boolean
    pixelId: string | null
    injectDirect: boolean
  }
}

type StoredGtm = {
  enabled?: boolean
  container_id?: string
}

type StoredMeta = {
  enabled?: boolean
  pixel_id?: string
  prefer_gtm?: boolean
}

function normalizeContainerId(raw: string): string {
  const id = raw.trim().toUpperCase()
  if (!id) return ''
  if (id.startsWith('GTM-')) return id
  return `GTM-${id.replace(/^GTM-?/i, '')}`
}

function normalizePixelId(raw: string): string {
  return raw.trim().replace(/\s+/g, '')
}

async function readJson(
  key: string,
): Promise<{ value: Record<string, unknown> | null; updatedAt: string | null }> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('integration_settings')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle()
    if (error || !data) return { value: null, updatedAt: null }
    const value =
      data.value && typeof data.value === 'object' && !Array.isArray(data.value)
        ? (data.value as Record<string, unknown>)
        : null
    return { value, updatedAt: data.updated_at ?? null }
  } catch {
    return { value: null, updatedAt: null }
  }
}

export async function getGtmSettingsView(): Promise<GtmSettingsView> {
  const { value, updatedAt } = await readJson(GTM_SETTINGS_KEY)
  const stored = (value ?? {}) as StoredGtm
  const envId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || ''
  return {
    enabled: Boolean(stored.enabled),
    containerId: stored.container_id || envId || '',
    updatedAt,
  }
}

export async function getMetaPixelSettingsView(): Promise<MetaPixelSettingsView> {
  const { value, updatedAt } = await readJson(META_PIXEL_SETTINGS_KEY)
  const stored = (value ?? {}) as StoredMeta
  const envId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || ''
  return {
    enabled: Boolean(stored.enabled),
    pixelId: stored.pixel_id || envId || '',
    preferGtm: stored.prefer_gtm !== false,
    updatedAt,
  }
}

export const getPublicMarketingConfig = cache(
  async (): Promise<PublicMarketingConfig> => {
    const [gtm, meta] = await Promise.all([
      getGtmSettingsView(),
      getMetaPixelSettingsView(),
    ])
    const containerId = normalizeContainerId(gtm.containerId)
    const pixelId = normalizePixelId(meta.pixelId)
    const gtmActive = gtm.enabled && Boolean(containerId)
    const metaActive = meta.enabled && Boolean(pixelId)
    return {
      gtm: {
        enabled: gtmActive,
        containerId: gtmActive ? containerId : null,
      },
      meta: {
        enabled: metaActive,
        pixelId: metaActive ? pixelId : null,
        injectDirect: metaActive && (!gtmActive || !meta.preferGtm),
      },
    }
  },
)

export function buildGtmValueToStore(input: {
  enabled: boolean
  containerId: string
}): StoredGtm {
  return {
    enabled: input.enabled,
    container_id: normalizeContainerId(input.containerId),
  }
}

export function buildMetaPixelValueToStore(input: {
  enabled: boolean
  pixelId: string
  preferGtm: boolean
}): StoredMeta {
  return {
    enabled: input.enabled,
    pixel_id: normalizePixelId(input.pixelId),
    prefer_gtm: input.preferGtm,
  }
}
