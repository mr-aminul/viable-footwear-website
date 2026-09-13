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
import type { Product } from '@/lib/catalog/types'

export interface CartItem {
  product: Product
  size: number
  quantity: number
  variantId?: string
}

interface CartContextValue {
  items: CartItem[]
  wishlist: string[]
  hydrated: boolean
  addToCart: (
    product: Product,
    size: number,
    quantity?: number,
    variantId?: string,
  ) => void
  removeFromCart: (productId: string, size: number) => void
  updateQuantity: (productId: string, size: number, quantity: number) => void
  toggleWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  cartCount: number
  cartTotal: number
  cartWeightKg: number
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const CART_STORAGE_KEY = 'viable-cart'
const WISHLIST_STORAGE_KEY = 'viable-wishlist'

type PersistedCartItem = {
  product: Product
  size: number
  quantity: number
  variantId?: string
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const storedItems = readJson<PersistedCartItem[]>(CART_STORAGE_KEY, [])
    const storedWishlist = readJson<string[]>(WISHLIST_STORAGE_KEY, [])
    if (Array.isArray(storedItems)) setItems(storedItems)
    if (Array.isArray(storedWishlist)) setWishlist(storedWishlist)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore quota errors
    }
  }, [items, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify(wishlist),
      )
    } catch {
      // ignore
    }
  }, [wishlist, hydrated])

  const addToCart = useCallback(
    (
      product: Product,
      size: number,
      quantity = 1,
      variantId?: string,
    ) => {
      const resolvedVariantId =
        variantId ??
        product.variants.find((v) => v.sizeEu === size && v.stock > 0)?.id

      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.product.id === product.id &&
            i.size === size &&
            i.variantId === resolvedVariantId,
        )
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id &&
            i.size === size &&
            i.variantId === resolvedVariantId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        }
        return [
          ...prev,
          { product, size, quantity, variantId: resolvedVariantId },
        ]
      })
    },
    [],
  )

  const removeFromCart = useCallback((productId: string, size: number) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product.id === productId && i.size === size)),
    )
  }, [])

  const updateQuantity = useCallback(
    (productId: string, size: number, quantity: number) => {
      if (quantity < 1) {
        removeFromCart(productId, size)
        return
      }
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === productId && i.size === size
            ? { ...i, quantity }
            : i,
        ),
      )
    },
    [removeFromCart],
  )

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    )
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  )

  const clearCart = useCallback(() => setItems([]), [])

  const cartCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  )

  const cartTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  )

  const cartWeightKg = useMemo(
    () =>
      Math.max(
        0.5,
        items.reduce(
          (sum, i) => sum + (i.product.weightKg || 0.5) * i.quantity,
          0,
        ),
      ),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      wishlist,
      hydrated,
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleWishlist,
      isWishlisted,
      cartCount,
      cartTotal,
      cartWeightKg,
      clearCart,
    }),
    [
      items,
      wishlist,
      hydrated,
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleWishlist,
      isWishlisted,
      cartCount,
      cartTotal,
      cartWeightKg,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
