'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { adminButtonClassName } from '@/components/admin/ui'
import { syncPathaoOrderStatuses } from '@/lib/orders/actions'

export function SyncActivePathaoButton({ orderIds }: { orderIds: string[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (orderIds.length === 0) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={adminButtonClassName('secondary')}
        disabled={pending}
        title="Pull latest Pathao status for every active shipment"
        onClick={() => {
          setNotice(null)
          setError(null)
          startTransition(async () => {
            const result = await syncPathaoOrderStatuses(orderIds)
            if (!result.ok || !result.data) {
              setError(result.ok ? 'Sync finished with no result.' : result.error)
              return
            }
            const { okCount, failCount } = result.data
            if (failCount > 0) {
              setError(
                `Synced ${okCount}, ${failCount} failed. Check order Pathao errors.`,
              )
            } else {
              setNotice(
                okCount === 1
                  ? 'Synced 1 shipment from Pathao.'
                  : `Synced ${okCount} shipments from Pathao.`,
              )
            }
            router.refresh()
          })
        }}
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
        )}
        {pending ? 'Syncing…' : 'Sync Pathao'}
      </button>
      {notice ? (
        <p className="text-[11px] font-medium text-navy">{notice}</p>
      ) : null}
      {error ? (
        <p className="max-w-[240px] text-right text-[11px] font-medium text-spark">
          {error}
        </p>
      ) : null}
    </div>
  )
}
