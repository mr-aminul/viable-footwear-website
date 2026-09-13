'use client'

import { useState, useTransition } from 'react'
import { Loader2, Truck } from 'lucide-react'
import { dispatchOrderToPathao } from '@/lib/orders/actions'
import { adminButtonClassName } from '@/components/admin/ui'

export function DispatchPathaoButton({
  orderId,
  disabled,
}: {
  orderId: string
  disabled?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        disabled={disabled || pending}
        className={adminButtonClassName('primary')}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await dispatchOrderToPathao(orderId)
            if (!result.ok) setError(result.error)
          })
        }}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Truck className="mr-2 h-4 w-4" />
        )}
        {pending ? 'Sending…' : 'Send to Pathao'}
      </button>
      {error ? <p className="mt-2 text-[12px] text-spark">{error}</p> : null}
    </div>
  )
}
