import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/admin'

export const OMS_WEBHOOK_SETTINGS_KEY = 'oms_webhook'

export type OmsWebhookEvent =
  | 'order.created'
  | 'order.paid'
  | 'order.shipped'
  | 'order.delivered'

export type OmsWebhookSettingsView = {
  enabled: boolean
  endpointUrl: string
  hasApiKey: boolean
  events: Record<OmsWebhookEvent, boolean>
  updatedAt: string | null
}

export type OmsWebhookConfig = {
  enabled: boolean
  endpointUrl: string
  apiKey: string | null
  events: Record<OmsWebhookEvent, boolean>
}

type StoredOms = {
  enabled?: boolean
  endpoint_url?: string
  api_key?: string
  events?: Partial<Record<OmsWebhookEvent, boolean>>
}

export const DEFAULT_OMS_EVENTS: Record<OmsWebhookEvent, boolean> = {
  'order.created': true,
  'order.paid': true,
  'order.shipped': true,
  'order.delivered': true,
}

async function readStored(): Promise<{
  value: StoredOms | null
  updatedAt: string | null
}> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('integration_settings')
      .select('value, updated_at')
      .eq('key', OMS_WEBHOOK_SETTINGS_KEY)
      .maybeSingle()
    if (error || !data) return { value: null, updatedAt: null }
    const value =
      data.value && typeof data.value === 'object' && !Array.isArray(data.value)
        ? (data.value as StoredOms)
        : null
    return { value, updatedAt: data.updated_at ?? null }
  } catch {
    return { value: null, updatedAt: null }
  }
}

function mergeEvents(
  partial?: Partial<Record<OmsWebhookEvent, boolean>>,
): Record<OmsWebhookEvent, boolean> {
  return {
    ...DEFAULT_OMS_EVENTS,
    ...(partial ?? {}),
  }
}

export async function getOmsWebhookSettingsView(): Promise<OmsWebhookSettingsView> {
  const { value, updatedAt } = await readStored()
  const envUrl = process.env.OMS_WEBHOOK_URL?.trim() || ''
  const envKey = process.env.OMS_WEBHOOK_API_KEY?.trim() || ''
  return {
    enabled: Boolean(value?.enabled),
    endpointUrl: value?.endpoint_url || envUrl || '',
    hasApiKey: Boolean(value?.api_key || envKey),
    events: mergeEvents(value?.events),
    updatedAt,
  }
}

export const resolveOmsWebhookConfig = cache(
  async (): Promise<OmsWebhookConfig> => {
    const { value } = await readStored()
    const envUrl = process.env.OMS_WEBHOOK_URL?.trim() || ''
    const envKey = process.env.OMS_WEBHOOK_API_KEY?.trim() || ''
    return {
      enabled: Boolean(value?.enabled),
      endpointUrl: (value?.endpoint_url || envUrl || '').trim(),
      apiKey: (value?.api_key || envKey || '').trim() || null,
      events: mergeEvents(value?.events),
    }
  },
)

export type OmsWebhookSettingsInput = {
  enabled: boolean
  endpointUrl: string
  apiKey: string
  events: Record<OmsWebhookEvent, boolean>
}

export async function buildOmsWebhookValueToStore(
  input: OmsWebhookSettingsInput,
): Promise<StoredOms> {
  const { value } = await readStored()
  const envKey = process.env.OMS_WEBHOOK_API_KEY?.trim() || ''
  return {
    enabled: input.enabled,
    endpoint_url: input.endpointUrl.trim(),
    api_key:
      input.apiKey.trim() || value?.api_key || envKey || '',
    events: input.events,
  }
}
