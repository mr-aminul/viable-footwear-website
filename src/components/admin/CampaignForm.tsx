'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  Field,
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'
import {
  createCampaign,
  updateCampaign,
} from '@/lib/campaigns/actions'
import {
  parseCampaignRules,
  type CampaignRuleType,
} from '@/lib/campaigns/rules'
import type { Json } from '@/lib/supabase/database.types'

type CampaignFormValues = {
  id?: string
  name: string
  priority: number
  active: boolean
  starts_at: string
  ends_at: string
  rules: Json
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CampaignForm({ initial }: { initial?: CampaignFormValues }) {
  const router = useRouter()
  const parsed = initial ? parseCampaignRules(initial.rules) : null
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [priority, setPriority] = useState(String(initial?.priority ?? 10))
  const [active, setActive] = useState(initial?.active ?? true)
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocal(initial?.starts_at || null),
  )
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initial?.ends_at || null))
  const [ruleType, setRuleType] = useState<CampaignRuleType>(
    parsed?.type ?? 'free_shipping_min_subtotal',
  )
  const [minSubtotal, setMinSubtotal] = useState(
    String(parsed?.min_subtotal ?? 3000),
  )
  const [percentOff, setPercentOff] = useState(
    String(parsed?.percent_off ?? 50),
  )
  const [fixedDelivery, setFixedDelivery] = useState(
    String(parsed?.fixed_delivery ?? 0),
  )
  const [cityAllow, setCityAllow] = useState(
    (parsed?.city_ids_allow ?? []).join(', '),
  )
  const [cityDeny, setCityDeny] = useState(
    (parsed?.city_ids_deny ?? []).join(', '),
  )

  const isEdit = Boolean(initial?.id)

  const save = () => {
    setError(null)
    setSuccess(null)
    const fd = new FormData()
    fd.set('name', name)
    fd.set('priority', priority)
    if (active) fd.set('active', 'on')
    if (startsAt) fd.set('starts_at', new Date(startsAt).toISOString())
    if (endsAt) fd.set('ends_at', new Date(endsAt).toISOString())
    fd.set('rule_type', ruleType)
    fd.set('min_subtotal', minSubtotal)
    fd.set('percent_off', percentOff)
    fd.set('fixed_delivery', fixedDelivery)
    fd.set('city_ids_allow', cityAllow)
    fd.set('city_ids_deny', cityDeny)

    startTransition(async () => {
      const result = isEdit
        ? await updateCampaign(initial!.id!, fd)
        : await createCampaign(fd)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess('Saved.')
      if (!isEdit && result.data?.id) {
        router.push(`/admin/campaigns/${result.data.id}`)
        router.refresh()
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-8 max-w-xl space-y-4">
      <Field label="Name">
        <input
          className={softFieldClassName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Free delivery over ৳3,000"
          disabled={pending}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priority" hint="Higher wins when multiple match.">
          <input
            className={softFieldClassName}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            inputMode="numeric"
            disabled={pending}
          />
        </Field>
        <Field label="Active">
          <label className="mt-2 flex items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={pending}
            />
            Campaign is live
          </label>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" hint="Optional">
          <input
            type="datetime-local"
            className={softFieldClassName}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Ends" hint="Optional">
          <input
            type="datetime-local"
            className={softFieldClassName}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="Rule type">
        <select
          className={softFieldClassName}
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as CampaignRuleType)}
          disabled={pending}
        >
          <option value="free_shipping_min_subtotal">
            Free shipping over amount
          </option>
          <option value="delivery_percent_off">Percent off delivery</option>
          <option value="delivery_fixed">Fixed delivery charge</option>
        </select>
      </Field>

      {ruleType === 'free_shipping_min_subtotal' ? (
        <Field label="Min subtotal (৳)">
          <input
            className={softFieldClassName}
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
            inputMode="numeric"
            disabled={pending}
          />
        </Field>
      ) : null}

      {ruleType === 'delivery_percent_off' ? (
        <Field label="Percent off delivery">
          <input
            className={softFieldClassName}
            value={percentOff}
            onChange={(e) => setPercentOff(e.target.value)}
            inputMode="numeric"
            disabled={pending}
          />
        </Field>
      ) : null}

      {ruleType === 'delivery_fixed' ? (
        <Field label="Fixed delivery (৳)" hint="Before COD fee inflate.">
          <input
            className={softFieldClassName}
            value={fixedDelivery}
            onChange={(e) => setFixedDelivery(e.target.value)}
            inputMode="numeric"
            disabled={pending}
          />
        </Field>
      ) : null}

      <Field
        label="City IDs allow"
        hint="Optional Pathao city_id list, comma-separated. Empty = all cities."
      >
        <input
          className={softFieldClassName}
          value={cityAllow}
          onChange={(e) => setCityAllow(e.target.value)}
          placeholder="e.g. 1, 2"
          disabled={pending}
        />
      </Field>
      <Field label="City IDs deny" hint="Optional — block these cities.">
        <input
          className={softFieldClassName}
          value={cityDeny}
          onChange={(e) => setCityDeny(e.target.value)}
          disabled={pending}
        />
      </Field>

      <FormError message={error} />
      <FormSuccess message={success} />

      <AdminActionButton type="button" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : isEdit ? 'Save campaign' : 'Create campaign'}
      </AdminActionButton>
    </div>
  )
}
