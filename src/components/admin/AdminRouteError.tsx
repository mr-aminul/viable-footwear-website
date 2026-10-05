'use client'

import { useEffect } from 'react'
import { AdminButton, AdminPageHeader } from '@/components/admin/ui'

type AdminRouteErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  backHref?: string
  backLabel?: string
}

/**
 * Recoverable admin error UI — never leave staff on the generic digest page.
 */
export function AdminRouteError({
  error,
  reset,
  title = 'Something went wrong',
  backHref = '/admin',
  backLabel = 'Back to admin',
}: AdminRouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <AdminPageHeader
        title={title}
        description="The last action failed. You can retry, or go back and continue from the catalog."
      />
      <div className="mt-8 space-y-4">
        <p className="text-[14px] text-ink">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy-deep"
          >
            Try again
          </button>
          <AdminButton href={backHref} variant="secondary">
            {backLabel}
          </AdminButton>
        </div>
      </div>
    </>
  )
}
