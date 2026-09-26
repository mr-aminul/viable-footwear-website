'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  createCategory,
  updateCategory,
} from '@/lib/catalog/actions/categories'
import { slugify } from '@/lib/catalog/slug'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import {
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'

type CategoryFormValues = {
  id?: string
  name: string
  slug: string
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
  const [active, setActive] = useState(initial?.active ?? true)
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(
    initial?.seo_description ?? '',
  )

  const isEdit = Boolean(initial?.id)

  const draft = useMemo(
    () => ({ name, slug, active, seoTitle, seoDescription }),
    [name, slug, active, seoTitle, seoDescription],
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(draft),
  )
  const isDirty = JSON.stringify(draft) !== savedSnapshot

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('slug', slug)
    formData.set('seo_title', seoTitle)
    formData.set('seo_description', seoDescription)
    if (active) formData.set('active', 'on')

    const result = isEdit
      ? await updateCategory(initial!.id!, formData)
      : await createCategory(formData)

    if (!result.ok) {
      setError(result.error)
      return false
    }

    setSavedSnapshot(JSON.stringify(draft))
    if (!isEdit && result.data?.id) {
      router.push(`/admin/catalog/categories/${result.data.id}`)
      router.refresh()
      return true
    }

    setSuccess('Category saved.')
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/catalog/categories"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-mute transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to categories
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={pending}
            onClick={() => setActive((value) => !value)}
            className={[
              'inline-flex items-center gap-2.5 rounded-full border bg-white px-3 py-2 text-[12px] font-medium disabled:opacity-60',
              active ? 'border-emerald-500 text-ink' : 'border-cloud text-ink',
            ].join(' ')}
          >
            <span className={active ? 'text-emerald-700' : 'text-mute'}>
              {active ? 'Live' : 'Draft'}
            </span>
            <span
              className={[
                'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                active ? 'bg-emerald-600' : 'bg-cloud',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                  active ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </span>
          </button>
          <AdminActionButton type="button" disabled={pending} onClick={save}>
            {pending
              ? 'Saving…'
              : isEdit
                ? 'Save category'
                : 'Create category'}
          </AdminActionButton>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <FormError message={error} />
        <FormSuccess message={success} />
      </div>

      <div className="mt-8 max-w-2xl space-y-6">
        <div>
          <input
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              if (!slugTouched) setSlug(slugify(next))
            }}
            className={`${softFieldClassName} font-display text-3xl font-extrabold tracking-tight md:text-4xl`}
            placeholder="Category name"
            aria-label="Name"
          />
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[12px] text-mute">/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className={`${softFieldClassName} text-[13px] text-mute`}
              placeholder="slug"
              aria-label="Slug"
            />
          </div>
          <p className="mt-1.5 px-1 text-[12px] text-mute">
            Used in shop filters and URLs.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              SEO title
            </span>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={`${softFieldClassName} mt-1.5`}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              SEO description
            </span>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={3}
              className={`${softFieldClassName} mt-1.5 resize-y`}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
