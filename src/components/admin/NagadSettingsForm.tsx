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
  saveNagadSettings,
  testNagadSettings,
} from '@/lib/integrations/actions'
import type { NagadSettingsView } from '@/lib/integrations/nagad-settings'

export function NagadSettingsForm({
  initial,
}: {
  initial: NagadSettingsView
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testing, startTest] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState(initial.mode)
  const [merchantId, setMerchantId] = useState(initial.merchantId)
  const [merchantNumber, setMerchantNumber] = useState(initial.merchantNumber)
  const [merchantPrivateKey, setMerchantPrivateKey] = useState('')
  const [nagadPublicKey, setNagadPublicKey] = useState('')

  const busy = pending || testing

  const formDataFromState = () => {
    const fd = new FormData()
    fd.set('mode', mode)
    fd.set('merchantId', merchantId)
    fd.set('merchantNumber', merchantNumber)
    fd.set('merchantPrivateKey', merchantPrivateKey)
    fd.set('nagadPublicKey', nagadPublicKey)
    return fd
  }

  return (
    <>
      <p className="text-[13px] text-mute">
        Paste credentials from the Nagad merchant portal. Use PEM keys or the
        bare base64 body. Callback URL is fixed for this site.
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

        <Field label="Merchant ID">
          <input
            className={softFieldClassName}
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </Field>

        <Field label="Merchant number">
          <input
            className={softFieldClassName}
            value={merchantNumber}
            onChange={(e) => setMerchantNumber(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Merchant private key"
          hint={
            initial.hasMerchantPrivateKey
              ? 'Leave blank to keep saved.'
              : 'RSA private key from Nagad onboarding'
          }
        >
          <textarea
            className={`${softFieldClassName} min-h-[120px] font-mono text-[12px]`}
            value={merchantPrivateKey}
            onChange={(e) => setMerchantPrivateKey(e.target.value)}
            placeholder={
              initial.hasMerchantPrivateKey
                ? '••••••••'
                : '-----BEGIN PRIVATE KEY-----'
            }
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Nagad public key"
          hint={
            initial.hasNagadPublicKey
              ? 'Leave blank to keep saved.'
              : 'PG public key from Nagad'
          }
        >
          <textarea
            className={`${softFieldClassName} min-h-[120px] font-mono text-[12px]`}
            value={nagadPublicKey}
            onChange={(e) => setNagadPublicKey(e.target.value)}
            placeholder={
              initial.hasNagadPublicKey
                ? '••••••••'
                : '-----BEGIN PUBLIC KEY-----'
            }
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
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
            setError(null)
            setSuccess(null)
            startTransition(async () => {
              const result = await saveNagadSettings(formDataFromState())
              if (!result.ok) {
                setError(result.error)
                return
              }
              setMerchantPrivateKey('')
              setNagadPublicKey('')
              setSuccess('Saved. Checkout can offer Nagad when configured.')
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
            'Save Nagad'
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
              const result = await testNagadSettings(formDataFromState())
              if (!result.ok) {
                setError(result.error)
                return
              }
              setSuccess('Keys OK — RSA encrypt/sign works.')
            })
          }}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing…
            </>
          ) : (
            'Test keys'
          )}
        </AdminActionButton>
      </div>
    </>
  )
}
