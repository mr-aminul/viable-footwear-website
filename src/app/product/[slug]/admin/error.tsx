'use client'

import { AdminRouteError } from '@/components/admin/AdminRouteError'

export default function ProductAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <AdminRouteError
      error={error}
      reset={reset}
      title="Couldn’t open this product"
      backHref="/admin/catalog"
      backLabel="Back to products"
    />
  )
}
