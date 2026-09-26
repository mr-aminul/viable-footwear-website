'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  Field,
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import { saveMetaPixelSettings } from '@/lib/integrations/actions'
import type { MetaPixelSettingsView } from '@/lib/integrations/marketing-settings'

export function MetaPixelSettingsForm({
  initial,
}: {
  initial: MetaPixelSettingsView
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [pixelId, setPixelId] = useState(initial.pixelId)
  const [preferGtm, setPreferGtm] = useState(initial.preferGtm)

  const draft = useMemo(
    () => ({ enabled, pixelId, preferGtm }),
    [enabled, pixelId, preferGtm],
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      enabled: initial.enabled,
      pixelId: initial.pixelId,
      preferGtm: initial.preferGtm,
    }),
  )
  const isDirty = JSON.stringify(draft) !== savedSnapshot

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    const fd = new FormData()
    fd.set('enabled', enabled ? '1' : '0')
    fd.set('pixelId', pixelId)
    fd.set('preferGtm', preferGtm ? '1' : '0')
    const result = await saveMetaPixelSettings(fd)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setSavedSnapshot(JSON.stringify(draft))
    setSuccess('Saved.')
    router.refresh()
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  return (
    <>
      <p className="text-[13px] text-mute">
        Prefer managing Meta Pixel inside GTM. Direct injection runs only when
        this is enabled and “Prefer GTM” is off (or GTM is disabled).
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
        <Field label="Pixel ID">
          <input
            className={softFieldClassName}
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="1234567890"
            disabled={pending}
            autoComplete="off"
          />
        </Field>
        <Field label="Prefer GTM-managed Pixel">
          <button
            type="button"
            disabled={pending}
            onClick={() => setPreferGtm((v) => !v)}
            className={[
              'w-full rounded-xl px-3 py-2.5 text-[13px] font-semibold transition',
              preferGtm
                ? 'bg-navy text-white'
                : 'bg-ink/[0.045] text-ink hover:bg-ink/[0.07]',
            ].join(' ')}
          >
            {preferGtm ? 'Yes — use GTM' : 'No — inject directly'}
          </button>
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
            startTransition(async () => {
              await performSave()
            })
          }}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Meta Pixel'
          )}
        </AdminActionButton>
      </div>
    </>
  )
}
