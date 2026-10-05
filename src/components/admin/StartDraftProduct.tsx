'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AdminButton,
  AdminPageHeader,
  adminButtonClassName,
} from '@/components/admin/ui'
import { adminProductPath } from '@/lib/admin/paths'
import { createDraftProduct } from '@/lib/catalog/actions/products'

/**
 * Starts a blank draft via a Server Action (POST), never during RSC render.
 * Visiting /admin/catalog/products/new used to insert + revalidate on GET,
 * which Next.js treats as an uncaught render error in production.
 */
export function StartDraftProduct() {
  const router = useRouter()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const startDraft = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createDraftProduct()
        if (result.ok && result.data) {
          router.replace(`${adminProductPath(result.data.slug)}?fresh=1`)
          return
        }
        setError(
          result.ok ? 'Couldn’t create a draft product.' : result.error,
        )
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Couldn’t create a draft product.',
        )
      }
    })
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    startDraft()
  }, [])

  if (error) {
    return (
      <>
        <AdminPageHeader
          title="New product"
          description="Couldn’t start a draft. Try again, or go back to the catalog."
        />
        <div className="mt-8 space-y-4">
          <p className="text-[14px] text-red-700">{error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminButtonClassName('primary')}
              disabled={pending}
              onClick={startDraft}
            >
              {pending ? 'Trying…' : 'Try again'}
            </button>
            <AdminButton href="/admin/catalog" variant="secondary">
              Back to products
            </AdminButton>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminPageHeader
        title="New product"
        description="Starting a blank draft…"
      />
      <div className="mt-8 animate-pulse space-y-4">
        <div className="h-4 w-64 max-w-full rounded bg-cloud/60" />
        <div className="h-48 rounded-2xl bg-white/80" />
      </div>
    </>
  )
}
