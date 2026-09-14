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
  const btnClass = compact
    ? `${adminButtonClassName('secondary')} px-2.5 py-1.5 text-[12px]`
    : adminButtonClassName('secondary')
  const primaryClass = compact
    ? `${adminButtonClassName('primary')} px-2.5 py-1.5 text-[12px]`
    : adminButtonClassName('primary')

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-1' : 'gap-2'}`}>
        {showSync && sent ? (
          <button
            type="button"
            className={btnClass}
            disabled={pending}
            title="Sync Pathao status"
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
              <Loader2 className={`mr-1.5 ${iconClass} animate-spin`} />
            ) : (
              <RefreshCw className={`mr-1.5 ${iconClass}`} />
            )}
            {busyAction === 'sync' ? 'Syncing…' : compact ? 'Sync' : 'Sync Pathao'}
          </button>
        ) : null}

        <button
          type="button"
          className={pathaoMode === 'sent' ? btnClass : primaryClass}
          disabled={pending || pathaoMode === 'sent'}
          title={pathaoTitle}
          onClick={() =>
            openDialog(pathaoMode === 'recreate' ? 'recreate' : 'pathao')
          }
        >
          {busyAction === 'dispatch' || busyAction === 'recreate' ? (
            <Loader2 className={`mr-1.5 ${iconClass} animate-spin`} />
          ) : (
            <Truck className={`mr-1.5 ${iconClass}`} />
          )}
          {pathaoLabel}
        </button>

        <button
          type="button"
          className={btnClass}
          disabled={pending || !canCancel}
          title={cancelTitle}
          onClick={() => openDialog('cancel')}
        >
          {busyAction === 'cancel' ? (
            <Loader2 className={`mr-1.5 ${iconClass} animate-spin`} />
          ) : (
            <Ban className={`mr-1.5 ${iconClass}`} />
          )}
          {stranded ? 'Cancel Pathao' : 'Cancel'}
        </button>

        <button
          type="button"
          className={
            compact
              ? `${adminButtonClassName('danger')} px-2.5 py-1.5 text-[12px]`
              : adminButtonClassName('danger')
          }
          disabled={pending}
          title="Delete order permanently"
          onClick={() => openDialog('delete')}
        >
          {busyAction === 'delete' ? (
            <Loader2 className={`mr-1.5 ${iconClass} animate-spin`} />
          ) : (
            <Trash2 className={`mr-1.5 ${iconClass}`} />
          )}
          Delete
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
