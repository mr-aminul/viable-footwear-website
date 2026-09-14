'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Ban, Loader2, Trash2, Truck } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import {
  cancelOrders,
  deleteOrders,
  dispatchOrdersToPathao,
} from '@/lib/orders/actions'
import {
  isPathaoShipmentStranded,
  pathaoStatusLabel,
  storeStatusLabel,
} from '@/lib/orders/status-labels'
import type { AdminOrderListRow } from '@/lib/orders/types'
import { OrderAdminActions } from '@/components/admin/OrderAdminActions'
import {
  OrderConfirmDialog,
  type OrderConfirmDialogVariant,
} from '@/components/admin/OrderConfirmDialog'
import { adminButtonClassName } from '@/components/admin/ui'

function canDispatchOrder(order: AdminOrderListRow) {
  return !order.pathao_consignment_id && order.status !== 'cancelled'
}

function canCancelOrder(order: AdminOrderListRow) {
  return order.status !== 'cancelled' || isPathaoShipmentStranded(order)
}

type BulkFailure = {
  orderId: string
  orderNumber: string | null
  error: string
}

type DialogState = {
  variant: Extract<OrderConfirmDialogVariant, 'cancel' | 'delete'>
} | null

export function OrdersTable({ orders }: { orders: AdminOrderListRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkSummary, setBulkSummary] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()

  const ordersById = useMemo(() => {
    const map = new Map<string, AdminOrderListRow>()
    for (const order of orders) map.set(order.id, order)
    return map
  }, [orders])

  const selectedOrders = useMemo(
    () =>
      [...selected]
        .map((id) => ordersById.get(id))
        .filter((order): order is AdminOrderListRow => Boolean(order)),
    [selected, ordersById],
  )

  const selectedDispatchable = useMemo(
    () => selectedOrders.filter(canDispatchOrder).map((order) => order.id),
    [selectedOrders],
  )
  const selectedCancellable = useMemo(
    () => selectedOrders.filter(canCancelOrder).map((order) => order.id),
    [selectedOrders],
  )
  const selectedDeletable = useMemo(
    () => selectedOrders.map((order) => order.id),
    [selectedOrders],
  )
  const selectedWithPathao = useMemo(
    () =>
      selectedOrders.filter((order) => Boolean(order.pathao_consignment_id))
        .length,
    [selectedOrders],
  )

  const allSelected =
    orders.length > 0 && orders.every((order) => selected.has(order.id))
  const someSelected =
    !allSelected && orders.some((order) => selected.has(order.id))

  const confirmWord =
    dialog?.variant === 'delete'
      ? 'delete'
      : dialog?.variant === 'cancel'
        ? 'cancel'
        : undefined
  const canConfirmTyped = Boolean(
    confirmWord && confirmText.trim() === confirmWord,
  )

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setBulkError(null)
    setBulkSummary(null)
  }

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(orders.map((order) => order.id)) : new Set())
    setBulkError(null)
    setBulkSummary(null)
  }

  const clearSelection = () => {
    setSelected(new Set())
    setBulkError(null)
    setBulkSummary(null)
  }

  const openDialog = (variant: 'cancel' | 'delete') => {
    setBulkError(null)
    setBulkSummary(null)
    setConfirmText('')
    setDialog({ variant })
  }

  const closeDialog = () => {
    if (pending) return
    setDialog(null)
    setConfirmText('')
  }

  const applyBulkResult = (
    ids: string[],
    result:
      | { ok: true; data?: { okCount: number; failCount: number; failures: BulkFailure[] } }
      | { ok: false; error: string },
    successLabel: (okCount: number) => string,
  ) => {
    if (!result.ok || !result.data) {
      setBulkError(result.ok ? 'Unexpected response.' : result.error)
      return
    }
    const { okCount, failCount, failures } = result.data
    if (failCount === 0) {
      setBulkSummary(successLabel(okCount))
      setSelected(new Set())
      setDialog(null)
      setConfirmText('')
      return
    }
    const detail = failures
      .slice(0, 3)
      .map((f) => `${f.orderNumber ?? f.orderId}: ${f.error}`)
      .join(' · ')
    const more = failures.length > 3 ? ` (+${failures.length - 3} more)` : ''
    setBulkError(`${okCount} succeeded, ${failCount} failed. ${detail}${more}`)
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (!failures.some((f) => f.orderId === id)) next.delete(id)
      }
      return next
    })
    setDialog(null)
    setConfirmText('')
  }

  const runBulkDispatch = () => {
    if (selectedDispatchable.length === 0) return
    setBulkError(null)
    setBulkSummary(null)
    const ids = [...selectedDispatchable]
    startTransition(async () => {
      const result = await dispatchOrdersToPathao(ids)
      applyBulkResult(ids, result, (okCount) =>
        okCount === 1
          ? '1 order sent to Pathao.'
          : `${okCount} orders sent to Pathao.`,
      )
    })
  }

  const runConfirmedBulkAction = () => {
    if (!dialog) return
    if (dialog.variant === 'cancel') {
      if (selectedCancellable.length === 0) return
      const ids = [...selectedCancellable]
      startTransition(async () => {
        const result = await cancelOrders(ids)
        applyBulkResult(ids, result, (okCount) =>
          okCount === 1
            ? '1 order cancelled.'
            : `${okCount} orders cancelled.`,
        )
      })
      return
    }

    if (selectedDeletable.length === 0) return
    const ids = [...selectedDeletable]
    startTransition(async () => {
      const result = await deleteOrders(ids)
      applyBulkResult(ids, result, (okCount) =>
        okCount === 1 ? '1 order deleted.' : `${okCount} orders deleted.`,
      )
    })
  }

  const selectionCount = selectedOrders.length
  const showToolbar = selectionCount > 0
  const dialogBulk =
    dialog?.variant === 'cancel'
      ? {
          count: selectedCancellable.length,
          withPathao: selectedOrders.filter(
            (order) =>
              canCancelOrder(order) && Boolean(order.pathao_consignment_id),
          ).length,
        }
      : dialog?.variant === 'delete'
        ? {
            count: selectedDeletable.length,
            withPathao: selectedWithPathao,
          }
        : undefined

  return (
    <div className="mt-8 space-y-3">
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cloud bg-white px-4 py-3 sm:gap-3">
          <p className="mr-1 text-[13px] font-medium text-ink">
            {selectionCount} selected
          </p>
          {selectedDispatchable.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={runBulkDispatch}
              className={adminButtonClassName('primary')}
            >
              {pending && !dialog ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              {pending && !dialog
                ? 'Sending…'
                : `Send ${selectedDispatchable.length} to Pathao`}
            </button>
          ) : null}
          {selectedCancellable.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => openDialog('cancel')}
              className={adminButtonClassName('secondary')}
            >
              <Ban className="mr-2 h-4 w-4" />
              Cancel {selectedCancellable.length}
            </button>
          ) : null}
          {selectedDeletable.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => openDialog('delete')}
              className={adminButtonClassName('danger')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedDeletable.length}
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={clearSelection}
            className={adminButtonClassName('ghost')}
          >
            Clear
          </button>
        </div>
      ) : null}

      {bulkError ? (
        <p className="rounded-xl border border-spark/30 bg-spark/10 px-4 py-3 text-[13px] text-spark">
          {bulkError}
        </p>
      ) : null}
      {bulkSummary ? (
        <p className="rounded-xl border border-navy/20 bg-navy/5 px-4 py-3 text-[13px] text-navy">
          {bulkSummary}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[1080px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-cloud accent-navy"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  disabled={orders.length === 0 || pending}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all orders"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <p className="font-medium text-ink">No orders found</p>
                  <p className="mt-1 text-mute">
                    Try clearing filters, or wait for the next storefront order.
                  </p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isSelected = selected.has(order.id)
                const stranded = isPathaoShipmentStranded(order)

                return (
                  <tr
                    key={order.id}
                    className={[
                      'border-b border-cloud last:border-0',
                      order.status === 'cancelled' ? 'bg-mist/30' : '',
                      isSelected ? 'bg-navy/[0.03]' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-cloud accent-navy disabled:opacity-40"
                        checked={isSelected}
                        disabled={pending}
                        onChange={(e) =>
                          toggleOne(order.id, e.target.checked)
                        }
                        aria-label={`Select order ${order.order_number}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        {order.order_number}
                      </Link>
                      {order.pathao_consignment_id ? (
                        <p
                          className="mt-0.5 font-mono text-[11px] text-mute"
                          title={order.pathao_consignment_id}
                        >
                          {order.pathao_consignment_id}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 uppercase text-mute">
                      {order.payment_method}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{order.full_name}</p>
                      <p className="text-mute">{order.phone}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(Number(order.total))}
                    </td>
                    <td className="px-4 py-3">
                      {order.pathao_error && !order.pathao_consignment_id ? (
                        <span className="font-medium text-spark">
                          Pathao failed
                        </span>
                      ) : stranded ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-spark">Cancelled</p>
                          <p className="text-[11px] text-spark">
                            Pathao still active
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p
                            className={
                              order.pathao_consignment_id
                                ? 'font-medium text-navy'
                                : 'font-medium text-ink'
                            }
                          >
                            {storeStatusLabel(order.status)}
                          </p>
                          {order.pathao_consignment_id ? (
                            <p className="text-[11px] text-mute">
                              Pathao: {pathaoStatusLabel(order.pathao_status)}
                            </p>
                          ) : null}
                          {order.pathao_error ? (
                            <p className="text-[11px] text-spark">
                              {order.pathao_error}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-mute">
                      {new Date(order.created_at).toLocaleString('en-BD', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <OrderAdminActions order={order} compact />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {dialog && dialogBulk && dialogBulk.count > 0 ? (
        <OrderConfirmDialog
          variant={dialog.variant}
          bulk={dialogBulk}
          isSubmitting={pending}
          confirmText={confirmText}
          onConfirmTextChange={setConfirmText}
          confirmWord={confirmWord}
          canConfirm={canConfirmTyped}
          onDismiss={closeDialog}
          onConfirm={runConfirmedBulkAction}
        />
      ) : null}
    </div>
  )
}
