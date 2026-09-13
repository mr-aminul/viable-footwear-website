import {
  resolveOmsWebhookConfig,
  type OmsWebhookEvent,
} from '@/lib/integrations/oms-webhook-settings'

export type OmsWebhookPayload = {
  event: OmsWebhookEvent
  occurredAt: string
  order: {
    id: string
    orderNumber: string
    status: string
    paymentMethod: string
    total: number
    currency: 'BDT'
    customer: {
      fullName: string
      phone: string
      email: string | null
    }
    shipping?: {
      cityName?: string
      zoneName?: string
      areaName?: string
      address?: string
      pathaoConsignmentId?: string | null
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Fire-and-forget friendly: retries with backoff; never throws to callers.
 * Stub mode (enabled + empty URL): logs only.
 */
export async function emitOmsWebhook(
  event: OmsWebhookEvent,
  order: OmsWebhookPayload['order'],
): Promise<{ ok: boolean; mode: 'sent' | 'stub' | 'skipped'; error?: string }> {
  try {
    const config = await resolveOmsWebhookConfig()
    if (!config.enabled) {
      return { ok: true, mode: 'skipped' }
    }
    if (!config.events[event]) {
      return { ok: true, mode: 'skipped' }
    }

    const payload: OmsWebhookPayload = {
      event,
      occurredAt: new Date().toISOString(),
      order: { ...order, currency: 'BDT' },
    }

    if (!config.endpointUrl) {
      console.info('[oms-webhook] stub', JSON.stringify(payload))
      return { ok: true, mode: 'stub' }
    }

    let lastError = 'Unknown error'
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(config.endpointUrl, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(config.apiKey
              ? { Authorization: `Bearer ${config.apiKey}` }
              : {}),
            'X-Viable-Event': event,
          },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          return { ok: true, mode: 'sent' }
        }
        lastError = `HTTP ${res.status}`
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
      if (attempt < 2) await sleep(300 * 2 ** attempt)
    }

    console.error('[oms-webhook] failed', event, lastError)
    return { ok: false, mode: 'sent', error: lastError }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[oms-webhook]', message)
    return { ok: false, mode: 'skipped', error: message }
  }
}

export function orderPayloadFromRow(row: {
  id: string
  order_number: string
  status: string
  payment_method: string
  total: number
  full_name: string
  phone: string
  email: string | null
  city_name?: string
  zone_name?: string
  area_name?: string
  address?: string
  pathao_consignment_id?: string | null
}): OmsWebhookPayload['order'] {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    total: Number(row.total),
    currency: 'BDT',
    customer: {
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
    },
    shipping: {
      cityName: row.city_name,
      zoneName: row.zone_name,
      areaName: row.area_name,
      address: row.address,
      pathaoConsignmentId: row.pathao_consignment_id ?? null,
    },
  }
}
