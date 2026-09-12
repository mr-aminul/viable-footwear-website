'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  updateCategory,
} from '@/lib/catalog/actions/categories'
import { slugify } from '@/lib/catalog/slug'
import {
  AdminButton,
  Field,
  FormError,
  FormSuccess,
  inputClassName,
} from '@/components/admin/ui'

type CategoryFormValues = {
  id?: string
  name: string
  slug: string
  sort_order: number
  active: boolean
  seo_title: string
  seo_description: string
}

export function CategoryForm({
  initial,
}: {
  initial?: CategoryFormValues
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
        ? await updateCategory(initial!.id!, formData)
        : await createCategory(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (!isEdit && result.data?.id) {
        router.push(`/admin/catalog/categories/${result.data.id}`)
        router.refresh()
        return
      }

      setSuccess('Category saved.')
      router.refresh()
    })
  }

  const toggleActive = () => {
    if (!initial?.id) return
    setError(null)
    startTransition(async () => {
      const result = initial.active
        ? await deactivateCategory(initial.id!)
        : await activateCategory(initial.id!)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(initial.active ? 'Category deactivated.' : 'Category activated.')
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
        <Field label="Slug" hint="Used in shop filters and URLs.">
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
        <Field label="Sort order">
          <input
            name="sort_order"
            type="number"
            defaultValue={initial?.sort_order ?? 0}
            className={inputClassName}
          />
        </Field>
        <Field label="Active">
          <label className="mt-2 flex items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial?.active ?? true}
              className="h-4 w-4 rounded border-cloud"
            />
            Visible on storefront when active
          </label>
        </Field>
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
          {pending ? 'Saving…' : isEdit ? 'Save category' : 'Create category'}
        </AdminButton>
        {isEdit ? (
          <AdminButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={toggleActive}
          >
            {initial?.active ? 'Deactivate' : 'Activate'}
          </AdminButton>
        ) : null}
        <AdminButton href="/admin/catalog/categories" variant="ghost">
          Back to list
        </AdminButton>
      </div>
    </form>
  )
}
