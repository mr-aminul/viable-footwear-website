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
  saveBkashSettings,
  testBkashSettings,
} from '@/lib/integrations/actions'
import type { BkashSettingsView } from '@/lib/integrations/bkash-settings'

export function BkashSettingsForm({
  initial,
}: {
  initial: BkashSettingsView
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testing, startTest] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState(initial.mode)
  const [username, setUsername] = useState(initial.username)
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [password, setPassword] = useState('')

  const nonSecretDraft = useMemo(
    () => ({ mode, username }),
    [mode, username],
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({ mode: initial.mode, username: initial.username }),
  )
  const hasSecretDraft = Boolean(appKey || appSecret || password)
  const isDirty =
    JSON.stringify(nonSecretDraft) !== savedSnapshot || hasSecretDraft

  const busy = pending || testing

  const formDataFromState = () => {
    const fd = new FormData()
    fd.set('mode', mode)
    fd.set('username', username)
    fd.set('appKey', appKey)
    fd.set('appSecret', appSecret)
    fd.set('password', password)
    return fd
  }

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    const result = await saveBkashSettings(formDataFromState())
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setAppKey('')
    setAppSecret('')
    setPassword('')
    setSavedSnapshot(JSON.stringify(nonSecretDraft))
    setSuccess('Saved. Checkout can offer bKash when configured.')
    router.refresh()
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  return (
    <>
      <p className="text-[13px] text-mute">
        Paste credentials from bKash Merchant / Developer portal. Callback URL
        is fixed for this site.
      </p>
      <p className="mt-2 rounded-xl bg-mist px-3 py-2 font-mono text-[11px] text-mute break-all">
        {initial.callbackUrl}
      </p>

      {initial.source === 'env' ? (
        <p className="mt-3 rounded-xl bg-mist px-3 py-2 text-[12px] text-mute">
          Currently using server env. Save here to manage from Admin.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4">
        <Field label="Environment">
          <div className="flex gap-2">
            {(
              [
                { id: 'sandbox', label: 'Sandbox' },
                { id: 'production', label: 'Production' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => setMode(opt.id)}
                className={[
                  'flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition',
                  mode === opt.id
                    ? 'bg-navy text-white'
                    : 'bg-ink/[0.045] text-ink hover:bg-ink/[0.07]',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Username">
          <input
            className={softFieldClassName}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            autoComplete="username"
          />
        </Field>

        <Field
          label="App key"
          hint={initial.hasAppKey ? 'Leave blank to keep saved.' : 'Required'}
        >
          <input
            className={softFieldClassName}
            type="password"
            value={appKey}
            onChange={(e) => setAppKey(e.target.value)}
            placeholder={initial.hasAppKey ? '••••••••' : ''}
            disabled={busy}
            autoComplete="off"
          />
        </Field>

        <Field
          label="App secret"
          hint={initial.hasAppSecret ? 'Leave blank to keep saved.' : 'Required'}
        >
          <input
            className={softFieldClassName}
            type="password"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            placeholder={initial.hasAppSecret ? '••••••••' : ''}
            disabled={busy}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Password"
          hint={initial.hasPassword ? 'Leave blank to keep saved.' : 'Required'}
        >
          <input
            className={softFieldClassName}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={initial.hasPassword ? '••••••••' : ''}
            disabled={busy}
            autoComplete="new-password"
          />
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
            'Save bKash'
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
              const result = await testBkashSettings(formDataFromState())
              if (!result.ok) {
                setError(result.error)
                return
              }
              setSuccess('Token OK — credentials work.')
            })
          }}
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
}
