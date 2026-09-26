'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { PromoProductPicker } from '@/components/admin/PromoProductPicker'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import {
  Field,
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'
import type { RelatedPickerProduct } from '@/lib/catalog/queries'
import {
  createPromotion,
  updatePromotion,
} from '@/lib/promotions/actions'
import {
  normalizePromoCode,
  type PromoDiscountType,
} from '@/lib/promotions/rules'

type PromoFormValues = {
  id?: string
  title: string
  code: string
  description: string
  active: boolean
  starts_at: string
  ends_at: string
  never_expires: boolean
  discount_type: PromoDiscountType
  discount_value: number
  product_ids: string[]
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PromoForm({
  catalog,
  initial,
}: {
  catalog: RelatedPickerProduct[]
  initial?: PromoFormValues
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocal(initial?.starts_at || null),
  )
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initial?.ends_at || null))
  const [neverExpires, setNeverExpires] = useState(
    initial?.never_expires ?? !initial?.ends_at,
  )
  const [discountType, setDiscountType] = useState<PromoDiscountType>(
    initial?.discount_type ?? 'percent',
  )
  const [discountValue, setDiscountValue] = useState(
    String(initial?.discount_value ?? 10),
  )
  const [productIds, setProductIds] = useState<string[]>(
    initial?.product_ids ?? [],
  )

  const isEdit = Boolean(initial?.id)

  const draft = useMemo(
    () => ({
      title,
      code,
      description,
      active,
      startsAt,
      endsAt,
      neverExpires,
      discountType,
      discountValue,
      productIds,
    }),
    [
      title,
      code,
      description,
      active,
      startsAt,
      endsAt,
      neverExpires,
      discountType,
      discountValue,
      productIds,
    ],
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(draft),
  )
  const isDirty = JSON.stringify(draft) !== savedSnapshot

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    const fd = new FormData()
    fd.set('title', title)
    fd.set('code', normalizePromoCode(code))
    fd.set('description', description)
    if (active) fd.set('active', 'on')
    if (startsAt) fd.set('starts_at', new Date(startsAt).toISOString())
    if (neverExpires) {
      fd.set('never_expires', 'on')
    } else if (endsAt) {
      fd.set('ends_at', new Date(endsAt).toISOString())
    }
    fd.set('discount_type', discountType)
    fd.set('discount_value', discountValue)
    fd.set('product_ids', JSON.stringify(productIds))

    const result = isEdit
      ? await updatePromotion(initial!.id!, fd)
      : await createPromotion(fd)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setSavedSnapshot(JSON.stringify(draft))
    setSuccess('Saved.')
    if (!isEdit && result.data?.id) {
      router.push(`/admin/promotions/${result.data.id}`)
      router.refresh()
      return true
    }
    router.refresh()
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  const save = () => {
    startTransition(async () => {
      await performSave()
    })
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="max-w-xl space-y-4">
        <Field label="Title">
          <input
            className={softFieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Spring launch sale"
            disabled={pending}
          />
        </Field>

        <Field label="Promo code" hint="Customers enter this at checkout.">
          <input
            className={softFieldClassName}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SPRING20"
            disabled={pending}
            autoCapitalize="characters"
          />
        </Field>

        <Field label="Description" hint="Optional — for your team.">
          <textarea
            className={`${softFieldClassName} min-h-[5rem] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="20% off selected styles for launch week"
            disabled={pending}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type">
            <select
              className={softFieldClassName}
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as PromoDiscountType)
              }
              disabled={pending}
            >
              <option value="percent">Percent discount</option>
              <option value="flat">Flat discount (৳)</option>
            </select>
          </Field>
          <Field
            label={discountType === 'percent' ? 'Percent off' : 'Amount (৳)'}
          >
            <input
              className={softFieldClassName}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              inputMode="decimal"
              disabled={pending}
            />
          </Field>
        </div>

        <Field label="Active">
          <label className="mt-2 flex items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={pending}
            />
            Promo is live
          </label>
        </Field>

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
          <Field label="Ends" hint={neverExpires ? 'Never expires' : 'Optional'}>
            <input
              type="datetime-local"
              className={softFieldClassName}
              value={neverExpires ? '' : endsAt}
              onChange={(e) => {
                setNeverExpires(false)
                setEndsAt(e.target.value)
              }}
              disabled={pending || neverExpires}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={neverExpires}
            onChange={(e) => {
              const next = e.target.checked
              setNeverExpires(next)
              if (next) setEndsAt('')
            }}
            disabled={pending}
          />
          Never expire
        </label>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-ink">
          Applicable products
        </h2>
        <p className="mt-1 text-[13px] text-mute">
          Select the products this promo applies to. Discount is calculated only
          on matching items in the bag.
        </p>
        <div className="mt-4">
          <PromoProductPicker
            catalog={catalog}
            selectedIds={productIds}
            onChange={setProductIds}
            disabled={pending}
          />
        </div>
      </div>

      <div className="max-w-xl space-y-4">
        <FormError message={error} />
        <FormSuccess message={success} />
        <AdminActionButton type="button" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : isEdit ? 'Save promotion' : 'Create promotion'}
        </AdminActionButton>
      </div>
    </div>
  )
}
