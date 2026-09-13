'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink, Loader2, Package, RefreshCw } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import {
  pathaoTrackingUrl,
  useOrders,
  type PlacedOrder,
} from '@/context/OrdersContext'

function formatOrderDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function statusLabel(order: PlacedOrder): string {
  if (order.pathaoConsignmentId) {
    if (order.status === 'delivered') return 'Delivered'
    if (order.status === 'shipped') return 'Shipped'
    return 'With Pathao'
  }
  if (order.status === 'awaiting_fulfillment') return 'Preparing'
  if (order.status === 'cancelled') return 'Cancelled'
  return order.status ? order.status.replace(/_/g, ' ') : 'Placed'
}

export function OrdersPage() {
  const { orders, hydrated, updateOrder } = useOrders()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const autoRefreshed = useRef(false)

  useEffect(() => {
    if (!hydrated || autoRefreshed.current || orders.length === 0) return
    const pending = orders.filter((o) => !o.pathaoConsignmentId && o.phone)
    if (pending.length === 0) {
      autoRefreshed.current = true
      return
    }

    autoRefreshed.current = true
    let cancelled = false
    ;(async () => {
      for (const order of pending.slice(0, 5)) {
        if (cancelled) return
        try {
          const res = await fetch('/api/orders/lookup', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.orderId,
              phone: order.phone,
            }),
          })
          const data = (await res.json()) as {
            success?: boolean
            pathaoConsignmentId?: string | null
            status?: string | null
            total?: number
          }
          if (!res.ok || !data.success) continue
          updateOrder(order.orderId, {
            pathaoConsignmentId: data.pathaoConsignmentId ?? null,
            status: data.status ?? order.status,
            total:
              typeof data.total === 'number' ? data.total : order.total,
          })
        } catch {
          // ignore background refresh errors
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, orders, updateOrder])

  const copyText = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const refreshOne = async (order: PlacedOrder) => {
    setRefreshError(null)
    setRefreshingId(order.orderId)
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          phone: order.phone,
        }),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        pathaoConsignmentId?: string | null
        status?: string | null
        total?: number
      }
      if (!res.ok || !data.success) {
        setRefreshError(data.error || 'Could not refresh this order.')
        return
      }
      updateOrder(order.orderId, {
        pathaoConsignmentId: data.pathaoConsignmentId ?? null,
        status: data.status ?? order.status,
        total: typeof data.total === 'number' ? data.total : order.total,
      })
    } catch {
      setRefreshError('Connection problem. Try again.')
    } finally {
      setRefreshingId(null)
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center text-mute md:px-6">
        Loading your orders…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        Your orders
      </h1>
      <p className="mt-2 text-[15px] text-mute">
        Orders you placed on this device (saved in this browser). No account
        needed.
      </p>

      {refreshError ? (
        <p className="mt-4 rounded-xl border border-spark/30 bg-spark/5 px-4 py-3 text-[13px] text-spark">
          {refreshError}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-cloud bg-white px-6 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-mute" aria-hidden />
          <p className="mt-4 text-[15px] font-semibold text-ink">
            No orders on this device yet
          </p>
          <p className="mt-2 text-[14px] text-mute">
            After you checkout, your order will show up here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white hover:bg-navy-soft"
          >
            Shop now
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => {
            const trackUrl = order.pathaoConsignmentId
              ? pathaoTrackingUrl(order.pathaoConsignmentId, order.phone)
              : null
            return (
              <li
                key={order.orderId}
                className="overflow-hidden rounded-2xl border border-cloud bg-white"
              >
                <div className="border-b border-cloud px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-mute">
                        {formatOrderDate(order.date)}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-ink">
                        {statusLabel(order)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshOne(order)}
                      disabled={refreshingId === order.orderId}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cloud px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-mist disabled:opacity-50"
                    >
                      {refreshingId === order.orderId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-mute">Order ID</span>
                    <span className="font-mono text-[13px] font-semibold text-ink">
                      {order.orderId}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy order ID"
                      onClick={() =>
                        copyText(order.orderId, `${order.orderId}-id`)
                      }
                      className="rounded-lg p-1.5 text-mute hover:bg-mist hover:text-ink"
                    >
                      {copiedKey === `${order.orderId}-id` ? (
                        <Check className="h-3.5 w-3.5 text-navy" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {order.pathaoConsignmentId ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] text-mute">Tracking ID</span>
                      <span className="font-mono text-[13px] font-semibold text-ink">
                        {order.pathaoConsignmentId}
                      </span>
                      <button
                        type="button"
                        aria-label="Copy tracking ID"
                        onClick={() =>
                          copyText(
                            order.pathaoConsignmentId!,
                            `${order.orderId}-track`,
                          )
                        }
                        className="rounded-lg p-1.5 text-mute hover:bg-mist hover:text-ink"
                      >
                        {copiedKey === `${order.orderId}-track` ? (
                          <Check className="h-3.5 w-3.5 text-navy" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : null}

                  {order.itemsSummary ? (
                    <p className="text-[13px] text-mute line-clamp-2">
                      {order.itemsSummary}
                    </p>
                  ) : null}

                  {order.total != null ? (
                    <p className="text-[14px] font-semibold text-ink">
                      {formatPrice(order.total)}
                    </p>
                  ) : null}

                  {trackUrl ? (
                    <a
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-4 py-3.5 text-[14px] font-semibold text-white hover:bg-navy-soft"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Track delivery
                    </a>
                  ) : (
                    <p className="text-[12px] text-mute">
                      Tracking appears here after we send your order to Pathao.
                      Tap Refresh to check.
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
