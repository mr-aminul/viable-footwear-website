'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  createProduct,
  deactivateProduct,
  updateProduct,
} from '@/lib/catalog/actions/products'
import { slugify } from '@/lib/catalog/slug'
import {
  AdminButton,
  Field,
  FormError,
  FormSuccess,
  inputClassName,
} from '@/components/admin/ui'

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
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug))
  const isEdit = Boolean(initial?.id)

  const onSubmit = (formData: FormData) => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(initial!.id!, formData)
        : await createProduct(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (!isEdit && result.data?.id) {
        router.push(`/admin/catalog/products/${result.data.id}`)
        router.refresh()
        return
      }

      setSuccess('Product saved.')
      router.refresh()
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
    <form action={onSubmit} className="space-y-5">
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
            defaultValue={initial?.badge ?? ''}
            className={inputClassName}
          >
            <option value="">None</option>
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
        <Field label="Weight (kg)" hint="Used later for Pathao quotes.">
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
          {isEdit ? (
            <label className="flex items-center gap-2 text-[14px] text-ink">
              <input
                type="checkbox"
                name="active"
                defaultChecked={initial?.active ?? false}
                className="h-4 w-4"
              />
              Published (active)
            </label>
          ) : (
            <p className="text-[12px] text-mute">
              New products start unpublished. Add variants, then publish.
            </p>
          )}
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
        <AdminButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save product' : 'Create product'}
        </AdminButton>
        {isEdit && initial?.active ? (
          <AdminButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={deactivate}
          >
            Deactivate
          </AdminButton>
        ) : null}
        <AdminButton href="/admin/catalog/products" variant="ghost">
          Back to list
        </AdminButton>
      </div>
    </form>
  )
}
