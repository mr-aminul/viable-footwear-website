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
import { saveGtmSettings } from '@/lib/integrations/actions'
import type { GtmSettingsView } from '@/lib/integrations/marketing-settings'

export function GtmSettingsForm({ initial }: { initial: GtmSettingsView }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [containerId, setContainerId] = useState(initial.containerId)

  return (
    <>
      <p className="text-[13px] text-mute">
        Paste your GTM container ID (e.g. GTM-XXXX). When enabled, the
        storefront loads GTM and pushes ecommerce events to dataLayer.
      </p>

      <div className="mt-5 grid gap-4">
        <Field label="Enabled">
          <button
            type="button"
            disabled={pending}
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
        <Field label="Container ID">
          <input
            className={softFieldClassName}
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            placeholder="GTM-XXXXXXX"
            disabled={pending}
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="mt-5 space-y-3">
        <FormError message={error} />
        <FormSuccess message={success} />
      </div>

      <div className="mt-5">
        <AdminActionButton
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null)
            setSuccess(null)
            startTransition(async () => {
              const fd = new FormData()
              fd.set('enabled', enabled ? '1' : '0')
              fd.set('containerId', containerId)
              const result = await saveGtmSettings(fd)
              if (!result.ok) {
                setError(result.error)
                return
              }
              setSuccess('Saved. Storefront will pick this up on next load.')
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
            'Save GTM'
          )}
        </AdminActionButton>
      </div>
    </>
  )
}
