'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  Field,
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'
import {
  saveOmsWebhookSettings,
  testOmsWebhook,
} from '@/lib/integrations/actions'
import {
  DEFAULT_OMS_EVENTS,
  type OmsWebhookEvent,
  type OmsWebhookSettingsView,
} from '@/lib/integrations/oms-webhook-settings'

const EVENT_LABELS: Record<OmsWebhookEvent, string> = {
  'order.created': 'Order created',
  'order.paid': 'Order paid',
  'order.shipped': 'Order shipped',
  'order.delivered': 'Order delivered',
}

export function OmsWebhookSettingsForm({
  initial,
}: {
  initial: OmsWebhookSettingsView
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testing, startTest] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [endpointUrl, setEndpointUrl] = useState(initial.endpointUrl)
  const [apiKey, setApiKey] = useState('')
  const [events, setEvents] = useState(initial.events)

  const busy = pending || testing

  const formDataFromState = () => {
    const fd = new FormData()
    fd.set('enabled', enabled ? '1' : '0')
    fd.set('endpointUrl', endpointUrl)
    fd.set('apiKey', apiKey)
    for (const key of Object.keys(DEFAULT_OMS_EVENTS) as OmsWebhookEvent[]) {
      fd.set(`event_${key}`, events[key] ? '1' : '0')
    }
    return fd
  }

  return (
    <>
      <p className="text-[13px] text-mute">
        Outbound JSON webhooks for warehouse / OMS partners (Nuport-like). With
        enable on and no URL, events are logged only (stub mode).
      </p>

      <div className="mt-5 grid gap-4">
        <Field label="Enabled">
          <button
            type="button"
            disabled={busy}
            onClick={() => setEnabled((v) => !v)}
            className={[
              'w-full rounded-xl px-3 py-2.5 text-[13px] font-semibold transition',
              enabled
                ? 'bg-navy text-white'
                : 'bg-ink/[0.045] text-ink hover:bg-ink/[0.07]',
            ].join(' ')}
          >
            {enabled ? 'On' : 'Off'}
          </button>
        </Field>
        <Field label="Endpoint URL">
          <input
            className={softFieldClassName}
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="https://partner.example/webhooks/orders"
            disabled={busy}
            autoComplete="off"
          />
        </Field>
        <Field
          label="API key / bearer token"
          hint={
            initial.hasApiKey
              ? 'Leave blank to keep saved.'
              : 'Sent as Authorization: Bearer …'
          }
        >
          <input
            className={softFieldClassName}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={initial.hasApiKey ? '••••••••' : ''}
            disabled={busy}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Events">
          <div className="space-y-2">
            {(Object.keys(EVENT_LABELS) as OmsWebhookEvent[]).map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-xl bg-ink/[0.045] px-3 py-2.5 text-[13px]"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy"
                  checked={events[key]}
                  disabled={busy}
                  onChange={(e) =>
                    setEvents((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
                <span className="font-medium text-ink">{EVENT_LABELS[key]}</span>
                <span className="text-mute">{key}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-5 space-y-3">
        <FormError message={error} />
        <FormSuccess message={success} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AdminActionButton
          type="button"
          disabled={busy}
          onClick={() => {
            setError(null)
            setSuccess(null)
            startTransition(async () => {
              const result = await saveOmsWebhookSettings(formDataFromState())
              if (!result.ok) {
                setError(result.error)
                return
              }
              setApiKey('')
              setSuccess('Saved.')
              router.refresh()
            })
          }}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save webhook'
          )}
        </AdminActionButton>
        <AdminActionButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setError(null)
            setSuccess(null)
            startTest(async () => {
              const result = await testOmsWebhook(formDataFromState())
              if (!result.ok) {
                setError(result.error)
                return
              }
              setSuccess(
                result.data?.mode === 'stub'
                  ? 'Stub OK — payload logged server-side (no URL).'
                  : 'Test payload delivered.',
              )
            })
          }}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing…
            </>
          ) : (
            'Send test event'
          )}
        </AdminActionButton>
      </div>
    </>
  )
}
