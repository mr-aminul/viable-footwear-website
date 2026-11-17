'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2, RefreshCw, Trash2, Truck } from 'lucide-react'
import {
  OrderConfirmDialog,
  type OrderConfirmDialogVariant,
} from '@/components/admin/OrderConfirmDialog'
import { adminButtonClassName } from '@/components/admin/ui'
import {
  cancelOrder,
  deleteOrder,
  dispatchOrderToPathao,
  reactivateOrderForResend,
  syncPathaoOrderStatus,
} from '@/lib/orders/actions'
import { isPathaoShipmentStranded } from '@/lib/orders/status-labels'

export type AdminOrderActionTarget = {
  id: string
  order_number: string
  full_name: string
  status: string
  pathao_consignment_id: string | null
  pathao_cancelled_at?: string | null
}

type DialogState =
  | { variant: OrderConfirmDialogVariant }
  | null

export function OrderAdminActions({
  order,
  compact,
  showSync,
}: {
  order: AdminOrderActionTarget
  /** Compact icon+label controls for table rows. */
  compact?: boolean
  /** Show Sync Pathao status (detail page). */
  showSync?: boolean
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [busyAction, setBusyAction] = useState<
    'dispatch' | 'cancel' | 'delete' | 'recreate' | 'sync' | null
  >(null)

  const cancelled = order.status === 'cancelled'
  const sent = Boolean(order.pathao_consignment_id)
  const stranded = isPathaoShipmentStranded(order)
  const pathaoMode: 'dispatch' | 'recreate' | 'sent' = cancelled
    ? 'recreate'
    : sent
      ? 'sent'
      : 'dispatch'
  const canCancel = !cancelled || stranded
  const confirmWord =
    dialog?.variant === 'delete'
      ? 'delete'
      : dialog?.variant === 'cancel'
        ? 'cancel'
        : undefined
  const canConfirmTyped = Boolean(
    confirmWord && confirmText.trim() === confirmWord,
  )

  function openDialog(variant: OrderConfirmDialogVariant) {
    setError(null)
    setNotice(null)
    setConfirmText('')
    setDialog({ variant })
  }

  function closeDialog() {
    if (pending) return
    setDialog(null)
    setConfirmText('')
  }

  function runAction(
    action: 'dispatch' | 'cancel' | 'delete' | 'recreate' | 'sync',
    fn: () => Promise<void>,
  ) {
    setError(null)
    setNotice(null)
    setBusyAction(action)
    startTransition(async () => {
      try {
        await fn()
      } finally {
        setBusyAction(null)
      }
    })
  }

  const pathaoLabel =
    pathaoMode === 'sent'
      ? 'Sent'
      : pathaoMode === 'recreate'
        ? 'Resend'
        : 'Send to Pathao'
  const pathaoTitle =
    pathaoMode === 'sent'
      ? 'Already sent to Pathao'
      : pathaoMode === 'recreate'
        ? 'Reopen this order so it can be sent to Pathao again'
        : 'Send to Pathao'
  const cancelTitle = stranded
    ? 'Cancel Pathao shipment for this order'
    : 'Cancel order (keeps record)'

  const iconClass = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const compactBtn =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-50'
  const btnClass = compact
    ? `${compactBtn} border-cloud bg-white text-ink hover:border-navy/30`
    : adminButtonClassName('secondary')
  const primaryClass = compact
    ? `${compactBtn} border-navy bg-navy text-white hover:bg-navy-deep`
    : adminButtonClassName('primary')
  const dangerClass = compact
    ? `${compactBtn} border-spark/30 bg-spark text-white hover:bg-spark-soft`
    : adminButtonClassName('danger')

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div
        className={`flex flex-nowrap items-center ${compact ? 'gap-1' : 'gap-2'}`}
      >
        {showSync && sent ? (
          <button
            type="button"
            className={btnClass}
            disabled={pending}
            title="Sync Pathao status"
            aria-label="Sync Pathao status"
            onClick={() =>
              runAction('sync', async () => {
                const result = await syncPathaoOrderStatus(order.id)
                if (!result.ok) {
                  setError(result.error)
                  return
                }
                setNotice(`Pathao: ${result.data?.pathaoLabel ?? 'updated'}`)
                router.refresh()
              })
            }
          >
            {busyAction === 'sync' ? (
              <Loader2 className={`${iconClass} animate-spin`} />
            ) : (
              <RefreshCw className={iconClass} />
            )}
            {compact ? null : (
              <span className="ml-1.5">
                {busyAction === 'sync' ? 'Syncing…' : 'Sync Pathao'}
              </span>
            )}
          </button>
        ) : null}

        <button
          type="button"
          className={pathaoMode === 'sent' ? btnClass : primaryClass}
          disabled={pending || pathaoMode === 'sent'}
          title={pathaoTitle}
          aria-label={pathaoLabel}
          onClick={() =>
            openDialog(pathaoMode === 'recreate' ? 'recreate' : 'pathao')
          }
        >
          {busyAction === 'dispatch' || busyAction === 'recreate' ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : (
            <Truck className={iconClass} />
          )}
          {compact ? null : <span className="ml-1.5">{pathaoLabel}</span>}
        </button>

        <button
          type="button"
          className={btnClass}
          disabled={pending || !canCancel}
          title={cancelTitle}
          aria-label={stranded ? 'Cancel Pathao' : 'Cancel'}
          onClick={() => openDialog('cancel')}
        >
          {busyAction === 'cancel' ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : (
            <Ban className={iconClass} />
          )}
          {compact ? null : (
            <span className="ml-1.5">
              {stranded ? 'Cancel Pathao' : 'Cancel'}
            </span>
          )}
        </button>

        <button
          type="button"
          className={dangerClass}
          disabled={pending}
          title="Delete order permanently"
          aria-label="Delete"
          onClick={() => openDialog('delete')}
        >
          {busyAction === 'delete' ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : (
            <Trash2 className={iconClass} />
          )}
          {compact ? null : <span className="ml-1.5">Delete</span>}
        </button>
      </div>

      {notice ? (
        <p className={`text-navy ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={`text-spark ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
          {error}
        </p>
      ) : null}

      {dialog ? (
        <OrderConfirmDialog
          variant={dialog.variant}
          order={order}
          isSubmitting={pending}
          confirmText={confirmText}
          onConfirmTextChange={setConfirmText}
          confirmWord={confirmWord}
          canConfirm={canConfirmTyped}
          onDismiss={closeDialog}
          onConfirm={() => {
            if (dialog.variant === 'pathao') {
              runAction('dispatch', async () => {
                const result = await dispatchOrderToPathao(order.id)
                if (!result.ok) {
                  setError(result.error)
                  return
                }
                setDialog(null)
                setNotice(`Sent to Pathao (${result.data?.consignmentId})`)
                router.refresh()
              })
              return
            }

            if (dialog.variant === 'recreate') {
              runAction('recreate', async () => {
                const result = await reactivateOrderForResend(order.id)
                if (!result.ok) {
                  setError(result.error)
                  return
                }
                setDialog(null)
                setNotice(
                  `Order ${result.data?.orderNumber ?? order.order_number} reopened for Pathao.`,
                )
                router.refresh()
              })
              return
            }

            if (dialog.variant === 'cancel') {
              runAction('cancel', async () => {
                const result = await cancelOrder(order.id)
                if (!result.ok) {
                  setError(result.error)
                  return
                }
                setDialog(null)
                setNotice(result.data?.message ?? 'Order cancelled.')
                router.refresh()
              })
              return
            }

            if (dialog.variant === 'delete') {
              runAction('delete', async () => {
                const result = await deleteOrder(order.id)
                if (!result.ok) {
                  setError(result.error)
                  return
                }
                setDialog(null)
                router.push('/admin/orders')
                router.refresh()
              })
            }
          }}
        />
      ) : null}
    </div>
  )
}
