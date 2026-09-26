'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition, type FormEvent } from 'react'
import {
  createProduct,
  deactivateProduct,
  updateProduct,
} from '@/lib/catalog/actions/products'
import { adminProductPath } from '@/lib/admin/paths'
import { slugify } from '@/lib/catalog/slug'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  AdminButton,
  Field,
  FormError,
  FormSuccess,
  inputClassName,
} from '@/components/admin/ui'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'

type CategoryOption = { id: string; name: string }

export type ProductFormValues = {
  id?: string
  name: string
  slug: string
  description: string
  price: number
  compare_at: number | null
  weight_kg: number
  category_id: string | null
  badge: string | null
  featured: boolean
  active: boolean
  seo_title: string
  seo_description: string
}

export function ProductForm({
  initial,
  categories,
}: {
  initial?: ProductFormValues
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug))
  const [isDirty, setIsDirty] = useState(false)
  const isEdit = Boolean(initial?.id)

  const markDirty = () => setIsDirty(true)

  const performSave = async (): Promise<boolean> => {
    const form = formRef.current
    if (!form) return false

    setError(null)
    setSuccess(null)

    const formData = new FormData(form)
    const result = isEdit
      ? await updateProduct(initial!.id!, formData)
      : await createProduct(formData)

    if (!result.ok) {
      setError(result.error)
      return false
    }

    setIsDirty(false)

    if (!isEdit && result.data?.id) {
      const nextSlug = String(formData.get('slug') ?? slug).trim() || slug
      router.push(adminProductPath(nextSlug))
      router.refresh()
      return true
    }

    setSuccess('Product saved.')
    router.refresh()
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      await performSave()
    })
  }

  const deactivate = () => {
    if (!initial?.id) return
    setError(null)
    startTransition(async () => {
      const result = await deactivateProduct(initial.id!)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess('Product deactivated.')
      router.refresh()
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={markDirty}
      onChange={markDirty}
      className="space-y-5"
    >
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="grid gap-5 rounded-2xl border border-cloud bg-white p-5 sm:grid-cols-2">
        <Field label="Name">
          <input
            name="name"
            required
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              if (!slugTouched) setSlug(slugify(next))
            }}
            className={inputClassName}
          />
        </Field>
        <Field label="Slug">
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            className={inputClassName}
          />
        </Field>
        <Field label="Category">
          <select
            name="category_id"
            defaultValue={initial?.category_id ?? ''}
            className={inputClassName}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Badge">
          <select
            name="badge"
            defaultValue={initial?.badge ?? 'New'}
            className={inputClassName}
          >
            <option value="New">New</option>
            <option value="Sale">Sale</option>
            <option value="Bestseller">Bestseller</option>
          </select>
        </Field>
        <Field label="Price (৳)">
          <input
            name="price"
            type="number"
            min={0}
            step="1"
            required
            defaultValue={initial?.price ?? ''}
            className={inputClassName}
          />
        </Field>
        <Field label="Compare-at (৳)">
          <input
            name="compare_at"
            type="number"
            min={0}
            step="1"
            defaultValue={initial?.compare_at ?? ''}
            className={inputClassName}
          />
        </Field>
        <Field label="Weight (kg)" hint="Used for delivery cost estimates.">
          <input
            name="weight_kg"
            type="number"
            min={0.01}
            step="0.01"
            defaultValue={initial?.weight_kg ?? 0.5}
            className={inputClassName}
          />
        </Field>
        <div className="space-y-3 pt-6">
          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial?.featured ?? false}
              className="h-4 w-4"
            />
            Featured on home
          </label>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea
              name="description"
              rows={5}
              defaultValue={initial?.description ?? ''}
              className={inputClassName}
            />
          </Field>
        </div>
        <Field label="SEO title">
          <input
            name="seo_title"
            defaultValue={initial?.seo_title ?? ''}
            className={inputClassName}
          />
        </Field>
        <Field label="SEO description">
          <textarea
            name="seo_description"
            rows={3}
            defaultValue={initial?.seo_description ?? ''}
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminActionButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save product' : 'Create product'}
        </AdminActionButton>
        {isEdit && initial?.active ? (
          <AdminActionButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={deactivate}
          >
            Deactivate
          </AdminActionButton>
        ) : null}
        <AdminButton href="/admin/catalog" variant="ghost">
          Back to products
        </AdminButton>
      </div>
    </form>
  )
}
