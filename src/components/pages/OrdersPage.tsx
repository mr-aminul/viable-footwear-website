'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
} from 'lucide-react'
import { motion } from 'framer-motion'
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
  if (order.status === 'pending_payment') return 'Awaiting payment'
  if (order.status === 'cancelled') return 'Cancelled'
  return order.status ? order.status.replace(/_/g, ' ') : 'Placed'
}

function statusTone(order: PlacedOrder): string {
  if (order.status === 'cancelled') return 'bg-spark/10 text-spark'
  if (order.status === 'delivered') return 'bg-navy/10 text-navy-deep'
  if (order.status === 'pending_payment') return 'bg-spark/10 text-spark'
  if (order.pathaoConsignmentId) return 'bg-navy/10 text-navy'
  return 'bg-navy/10 text-navy'
}

function amountLabel(order: PlacedOrder): string {
  if (
    order.paymentMethod === 'bkash' ||
    order.paymentMethod === 'nagad' ||
    order.status === 'pending_payment'
  ) {
    return order.status === 'pending_payment' ? 'Amount due' : 'Amount paid'
  }
  return 'Amount to pay'
}

function parseItemsSummary(summary: string): string[] {
  return summary
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean)
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
      <div className="mx-auto max-w-lg px-4 py-24 text-center md:px-6">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-navy" />
        <p className="mt-4 text-[15px] text-mute">Loading your orders…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:px-6 md:py-14">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Your orders
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
          Saved on this device — no account needed. Refresh anytime for Pathao
          tracking.
        </p>
      </div>

      {refreshError ? (
        <p className="mt-6 rounded-2xl border border-spark/30 bg-spark/5 px-4 py-3 text-[13px] text-spark">
          {refreshError}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <motion.div
          className="mt-12 flex flex-col items-center rounded-2xl border border-cloud bg-mist/80 px-6 py-16 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white">
            <Package className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <p className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">
            No orders yet
          </p>
          <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-mute">
            After checkout, your order number and amount show up here.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
          >
            Continue shopping
          </Link>
        </motion.div>
      ) : (
        <ul className="mt-10 space-y-5">
          {orders.map((order, index) => {
            const trackUrl = order.pathaoConsignmentId
              ? pathaoTrackingUrl(order.pathaoConsignmentId, order.phone)
              : null
            const items = order.itemsSummary
              ? parseItemsSummary(order.itemsSummary)
              : []
            const isRefreshing = refreshingId === order.orderId

            return (
              <motion.li
                key={order.orderId}
                className="overflow-hidden rounded-2xl border border-cloud bg-mist/80"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  ease: 'easeOut',
                  delay: Math.min(index * 0.06, 0.24),
                }}
              >
                <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
                  <div>
                    <p className="text-[12px] font-medium text-mute">
                      {formatOrderDate(order.date)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${statusTone(order)}`}
                    >
                      {statusLabel(order)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshOne(order)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-cream disabled:opacity-50"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Refresh
                  </button>
                </div>

                <div className="px-5 pt-5 sm:px-6">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                    Order number
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[18px] font-semibold tracking-tight text-navy">
                      {order.orderId}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(order.orderId, `${order.orderId}-id`)
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-cream"
                    >
                      {copiedKey === `${order.orderId}-id` ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedKey === `${order.orderId}-id` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {items.length > 0 ? (
                  <div className="mt-5 border-t border-cloud px-5 pt-4 sm:px-6">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                      Items
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {items.map((item) => (
                        <li
                          key={item}
                          className="text-[14px] leading-snug text-ink"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {order.total != null ? (
                  <div className="mt-4 flex items-baseline justify-between border-t border-cloud px-5 pt-4 sm:px-6">
                    <span className="text-[13px] text-mute">
                      {amountLabel(order)}
                    </span>
                    <span className="font-display text-[22px] tabular-nums tracking-tight text-navy-deep">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                ) : null}

                {order.pathaoConsignmentId ? (
                  <div className="mt-4 border-t border-cloud px-5 pt-4 sm:px-6">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-mute">
                      Tracking ID
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[15px] font-semibold tracking-tight text-navy">
                        {order.pathaoConsignmentId}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            order.pathaoConsignmentId!,
                            `${order.orderId}-track`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-cream"
                      >
                        {copiedKey === `${order.orderId}-track` ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedKey === `${order.orderId}-track`
                          ? 'Copied'
                          : 'Copy'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                  {trackUrl ? (
                    <a
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-4 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Track delivery
                    </a>
                  ) : (
                    <p className="rounded-xl bg-white/70 px-4 py-3 text-[13px] leading-relaxed text-mute">
                      Tracking appears here after we send your order to Pathao.
                      Tap Refresh to check.
                    </p>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      {orders.length > 0 ? (
        <div className="mt-8 flex justify-center">
          <Link
            href="/shop"
            className="inline-flex rounded-full border border-cloud bg-white px-6 py-3.5 text-[14px] font-semibold text-ink transition hover:bg-mist"
          >
            Continue shopping
          </Link>
        </div>
      ) : null}
    </div>
  )
}
