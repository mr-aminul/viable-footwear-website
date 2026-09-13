'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateOrderStatus } from '@/lib/orders/actions'
import { storeStatusLabel } from '@/lib/orders/status-labels'
import { allowedNextStatuses } from '@/lib/orders/status-transitions'
import type { OrderStatus } from '@/lib/supabase/database.types'
import {
  adminButtonClassName,
  inputClassName,
} from '@/components/admin/ui'

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string
  status: OrderStatus
}) {
  const router = useRouter()
  const nextOptions = allowedNextStatuses(status)
  const [selected, setSelected] = useState<OrderStatus | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (nextOptions.length === 0) {
    return (
      <p className="text-[13px] text-mute">
        Status is terminal ({storeStatusLabel(status)}).
      </p>
    )
  }

  const apply = () => {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, selected)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSelected('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Move status to
          </span>
          <select
            className={`${inputClassName} mt-1`}
            value={selected}
            disabled={pending}
            onChange={(e) =>
              setSelected((e.target.value || '') as OrderStatus | '')
            }
          >
            <option value="">Select…</option>
            {nextOptions.map((option) => (
              <option key={option} value={option}>
                {storeStatusLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={pending || !selected}
          onClick={apply}
          className={adminButtonClassName('secondary')}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Update
        </button>
      </div>
      {error ? (
        <p className="text-[12px] text-spark">{error}</p>
      ) : null}
    </div>
  )
}
