'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { adminButtonClassName } from '@/components/admin/ui'
import { isPathaoShipmentStranded } from '@/lib/orders/status-labels'

export type OrderConfirmDialogVariant =
  | 'delete'
  | 'cancel'
  | 'pathao'
  | 'recreate'

type OrderDialogTarget = {
  order_number: string
  full_name: string
  pathao_consignment_id?: string | null
  status?: string | null
  pathao_cancelled_at?: string | null
}

export type OrderConfirmBulkContext = {
  count: number
  withPathao: number
}

const COPY: Record<
  OrderConfirmDialogVariant,
  {
    title: string
    description: (order: OrderDialogTarget) => string
    bulkTitle: (count: number) => string
    bulkDescription: (bulk: OrderConfirmBulkContext) => string
    confirmWordClass: string
    confirmVariant: 'primary' | 'danger' | 'secondary'
    confirmLabel: string
    bulkConfirmLabel: (count: number) => string
    loadingLabel: string
  }
> = {
  delete: {
    title: 'Delete order?',
    description: (order) => {
      if (order.pathao_consignment_id) {
        return `This permanently removes order ${order.order_number} for ${order.full_name} and cancels the Pathao shipment (${order.pathao_consignment_id}). If the parcel has already been picked up, Pathao may reject the cancellation. This cannot be undone.`
      }
      return `This permanently removes order ${order.order_number} for ${order.full_name}. This cannot be undone.`
    },
    bulkTitle: (count) =>
      count === 1 ? 'Delete 1 order?' : `Delete ${count} orders?`,
    bulkDescription: ({ count, withPathao }) => {
      const pathaoNote =
        withPathao > 0
          ? ` ${withPathao} of them have Pathao shipments that will be cancelled first.`
          : ''
      return `This permanently removes ${count === 1 ? 'this order' : `these ${count} orders`}.${pathaoNote} If a parcel has already been picked up, Pathao may reject that cancellation. This cannot be undone.`
    },
    confirmWordClass: 'bg-spark/10 text-spark',
    confirmVariant: 'danger',
    confirmLabel: 'Delete order',
    bulkConfirmLabel: (count) =>
      count === 1 ? 'Delete order' : `Delete ${count} orders`,
    loadingLabel: 'Deleting…',
  },
  cancel: {
    title: 'Cancel order?',
    description: (order) => {
      if (
        order.pathao_consignment_id &&
        isPathaoShipmentStranded({
          status: order.status ?? '',
          pathao_consignment_id: order.pathao_consignment_id,
          pathao_cancelled_at: order.pathao_cancelled_at,
        })
      ) {
        return `Order ${order.order_number} for ${order.full_name} is cancelled locally, but the Pathao shipment (${order.pathao_consignment_id}) is still active. Confirm to cancel it on Pathao. If the parcel has already been picked up, Pathao may reject the cancellation.`
      }
      if (order.pathao_consignment_id) {
        return `Order ${order.order_number} for ${order.full_name} will be marked cancelled and the Pathao shipment (${order.pathao_consignment_id}) will be cancelled. If the parcel has already been picked up, Pathao may reject the cancellation.`
      }
      return `Order ${order.order_number} for ${order.full_name} will stay in the list with status cancelled. It will not be sent to Pathao.`
    },
    bulkTitle: (count) =>
      count === 1 ? 'Cancel 1 order?' : `Cancel ${count} orders?`,
    bulkDescription: ({ count, withPathao }) => {
      const pathaoNote =
        withPathao > 0
          ? ` Pathao shipments for ${withPathao} of them will also be cancelled.`
          : ''
      return `${count === 1 ? 'This order' : `These ${count} orders`} will be marked cancelled and stay in the list.${pathaoNote} If a parcel has already been picked up, Pathao may reject that cancellation.`
    },
    confirmWordClass: 'bg-amber-50 text-amber-800',
    confirmVariant: 'secondary',
    confirmLabel: 'Cancel order',
    bulkConfirmLabel: (count) =>
      count === 1 ? 'Cancel order' : `Cancel ${count} orders`,
    loadingLabel: 'Cancelling…',
  },
  pathao: {
    title: 'Send to Pathao?',
    description: (order) =>
      `Create a Pathao delivery for order ${order.order_number} (${order.full_name}).`,
    bulkTitle: (count) =>
      count === 1 ? 'Send 1 order to Pathao?' : `Send ${count} orders to Pathao?`,
    bulkDescription: ({ count }) =>
      `Create Pathao deliveries for ${count === 1 ? 'this order' : `these ${count} orders`}.`,
    confirmWordClass: '',
    confirmVariant: 'primary',
    confirmLabel: 'Send to Pathao',
    bulkConfirmLabel: (count) =>
      count === 1 ? 'Send to Pathao' : `Send ${count} to Pathao`,
    loadingLabel: 'Sending…',
  },
  recreate: {
    title: 'Re-create this order?',
    description: (order) =>
      `Create a new order for ${order.full_name} using the same items and delivery details as ${order.order_number}. The new order will be ready to send to Pathao.`,
    bulkTitle: () => 'Re-create orders?',
    bulkDescription: () => 'Bulk re-create is not supported.',
    confirmWordClass: '',
    confirmVariant: 'primary',
    confirmLabel: 'Re-create order',
    bulkConfirmLabel: () => 'Re-create order',
    loadingLabel: 'Re-creating…',
  },
}

type OrderConfirmDialogProps = {
  variant: OrderConfirmDialogVariant
  order?: OrderDialogTarget
  bulk?: OrderConfirmBulkContext
  isSubmitting: boolean
  onDismiss: () => void
  onConfirm: () => void
  confirmText?: string
  onConfirmTextChange?: (value: string) => void
  confirmWord?: string
  canConfirm?: boolean
}

export function OrderConfirmDialog({
  variant,
  order,
  bulk,
  confirmText,
  onConfirmTextChange,
  confirmWord,
  canConfirm,
  isSubmitting,
  onDismiss,
  onConfirm,
}: OrderConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)
  const copy = COPY[variant]
  const isBulk = Boolean(bulk)
  const titleId = `${variant}-order-title`
  const inputId = `${variant}-order-confirm`
  const needsTypedConfirm = variant === 'delete' || variant === 'cancel'
  const canSubmit = needsTypedConfirm ? Boolean(canConfirm) : true
  const title = isBulk && bulk ? copy.bulkTitle(bulk.count) : copy.title
  const description =
    isBulk && bulk
      ? copy.bulkDescription(bulk)
      : order
        ? copy.description(order)
        : ''
  const confirmLabel =
    isBulk && bulk ? copy.bulkConfirmLabel(bulk.count) : copy.confirmLabel

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        onClick={onDismiss}
        disabled={isSubmitting}
        aria-label="Close dialog"
      />

      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-cloud bg-white p-6 text-ink shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-bold text-ink"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              {description}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mute hover:bg-mist hover:text-ink"
            onClick={onDismiss}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {needsTypedConfirm ? (
          <>
            <label
              htmlFor={inputId}
              className="mt-6 block text-sm font-medium text-ink"
            >
              Type{' '}
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[12px] ${copy.confirmWordClass}`}
              >
                {confirmWord}
              </span>{' '}
              to confirm
            </label>
            <input
              id={inputId}
              type="text"
              value={confirmText ?? ''}
              onChange={(e) => onConfirmTextChange?.(e.target.value)}
              placeholder={confirmWord}
              className="mt-2 w-full rounded-xl border border-cloud bg-white px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-mute focus:border-navy/40"
              autoComplete="off"
              autoFocus
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit && !isSubmitting) {
                  e.preventDefault()
                  onConfirm()
                }
              }}
            />
          </>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={adminButtonClassName('ghost')}
            onClick={onDismiss}
            disabled={isSubmitting}
          >
            Dismiss
          </button>
          <button
            type="button"
            className={adminButtonClassName(copy.confirmVariant)}
            onClick={onConfirm}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {copy.loadingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
