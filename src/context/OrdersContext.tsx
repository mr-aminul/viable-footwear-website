'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** Guest order saved on this device for “Your Orders” (no login). */
export type PlacedOrder = {
  orderId: string
  date: string
  phone: string
  pathaoConsignmentId: string | null
  status?: string | null
  total?: number
  itemsSummary?: string
  paymentMethod?: 'cod' | 'bkash' | 'nagad'
}

type OrdersContextValue = {
  orders: PlacedOrder[]
  hydrated: boolean
  orderCount: number
  addOrder: (order: PlacedOrder) => void
  updateOrder: (orderId: string, patch: Partial<PlacedOrder>) => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

const ORDERS_STORAGE_KEY = 'viable-orders'

function readOrders(): PlacedOrder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is PlacedOrder =>
        Boolean(row && typeof row === 'object' && typeof row.orderId === 'string'),
    )
  } catch {
    return []
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<PlacedOrder[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setOrders(readOrders())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
    } catch {
      // ignore quota errors
    }
  }, [orders, hydrated])

  const addOrder = useCallback((order: PlacedOrder) => {
    setOrders((prev) => {
      if (prev.some((o) => o.orderId === order.orderId)) return prev
      return [order, ...prev]
    })
  }, [])

  const updateOrder = useCallback(
    (orderId: string, patch: Partial<PlacedOrder>) => {
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, ...patch } : o)),
      )
    },
    [],
  )

  const value = useMemo(
    () => ({
      orders,
      hydrated,
      orderCount: orders.length,
      addOrder,
      updateOrder,
    }),
    [orders, hydrated, addOrder, updateOrder],
  )

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  )
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext)
  if (!ctx) {
    throw new Error('useOrders must be used within OrdersProvider')
  }
  return ctx
}

export { pathaoTrackingUrl } from '@/lib/orders/pathao-tracking'
