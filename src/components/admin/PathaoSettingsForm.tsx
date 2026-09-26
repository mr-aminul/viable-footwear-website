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
import {
  savePathaoSettings,
  testPathaoSettings,
} from '@/lib/integrations/actions'
import type { PathaoSettingsView } from '@/lib/integrations/pathao-settings'

export function PathaoSettingsForm({
  initial,
  embedded = false,
}: {
  initial: PathaoSettingsView
  /** When true, omit outer card chrome (used inside the Integrations drawer). */
  embedded?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testing, startTest] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [storeId, setStoreId] = useState(initial.storeId)
  const [clientId, setClientId] = useState(initial.clientId)
  const [username, setUsername] = useState(initial.username)
  const [clientSecret, setClientSecret] = useState('')
  const [password, setPassword] = useState('')

  const nonSecretDraft = useMemo(
    () => ({ storeId, clientId, username }),
    [storeId, clientId, username],
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      storeId: initial.storeId,
      clientId: initial.clientId,
      username: initial.username,
    }),
  )
  const hasSecretDraft = Boolean(clientSecret || password)
  const isDirty =
    JSON.stringify(nonSecretDraft) !== savedSnapshot || hasSecretDraft

  const busy = pending || testing

  const formDataFromState = () => {
    const fd = new FormData()
    fd.set('storeId', storeId)
    fd.set('clientId', clientId)
    fd.set('username', username)
    fd.set('clientSecret', clientSecret)
    fd.set('password', password)
    return fd
  }

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    const result = await savePathaoSettings(formDataFromState())
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setClientSecret('')
    setPassword('')
    setSavedSnapshot(JSON.stringify(nonSecretDraft))
    setSuccess('Saved. Checkout and dispatch will use these credentials.')
    router.refresh()
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  const onSave = () => {
    startTransition(async () => {
      await performSave()
    })
  }

  const onTest = () => {
    setError(null)
    setSuccess(null)
    startTest(async () => {
      const result = await testPathaoSettings(formDataFromState())
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(
        `Connection works — Pathao returned ${result.data?.cities ?? 0} cities.`,
      )
    })
  }

  const body = (
    <>
      <p className="text-[13px] text-mute">
        Paste values from Pathao Merchant → Developer&apos;s API. Leave secret /
        password blank to keep what&apos;s already saved.
      </p>

      {initial.source === 'env' ? (
        <p className="mt-3 rounded-xl bg-mist px-3 py-2 text-[12px] text-mute">
          Currently using server env. Save here to manage from Admin instead.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4">
        <Field label="Store ID" hint="Numbers only — from Get Merchant Store Info.">
          <input
            className={softFieldClassName}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 400359"
            disabled={busy}
          />
        </Field>

        <Field label="Client ID">
          <input
            className={softFieldClassName}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </Field>

        <Field
          label="Client secret"
          hint={
            initial.hasClientSecret
              ? 'Leave blank to keep the saved secret.'
              : 'Required'
          }
        >
          <input
            className={softFieldClassName}
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            autoComplete="new-password"
            placeholder={initial.hasClientSecret ? '••••••••' : ''}
            disabled={busy}
          />
        </Field>

        <Field label="Merchant email / username">
          <input
            className={softFieldClassName}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={busy}
          />
        </Field>

        <Field
          label="Password"
          hint={
            initial.hasPassword
              ? 'Leave blank to keep the saved password.'
              : 'Required'
          }
        >
          <input
            className={softFieldClassName}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={initial.hasPassword ? '••••••••' : ''}
            disabled={busy}
          />
        </Field>
      </div>

      <div className="mt-5 space-y-3">
        <FormError message={error} />
        <FormSuccess message={success} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AdminActionButton type="button" disabled={busy} onClick={onSave}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Pathao'
          )}
        </AdminActionButton>
        <AdminActionButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onTest}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing…
            </>
          ) : (
            'Test connection'
          )}
        </AdminActionButton>
      </div>
    </>
  )

  if (embedded) return body

  return (
    <section className="rounded-2xl border border-cloud bg-white p-5 sm:p-6">
      {body}
    </section>
  )
}
