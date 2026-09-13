'use client'

import { useState, useTransition } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { syncPathaoOrderStatus } from '@/lib/orders/actions'
import { adminButtonClassName } from '@/components/admin/ui'

export function SyncPathaoStatusButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={adminButtonClassName('secondary')}
        onClick={() => {
          setError(null)
          setOkMsg(null)
          startTransition(async () => {
            const result = await syncPathaoOrderStatus(orderId)
            if (!result.ok) {
              setError(result.error)
              return
            }
            setOkMsg(`Pathao: ${result.data?.pathaoLabel ?? 'updated'}`)
          })
        }}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {pending ? 'Syncing…' : 'Sync Pathao status'}
      </button>
      {okMsg ? <p className="mt-2 text-[12px] text-navy">{okMsg}</p> : null}
      {error ? <p className="mt-2 text-[12px] text-spark">{error}</p> : null}
    </div>
  )
}
