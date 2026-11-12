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
import { isProductPreorderEnabled } from '@/lib/orders/preorder'

export interface CartItem {
  product: Product
  size: number
  quantity: number
  variantId?: string
  /** True when this line was added as a sold-out pre-order. */
  isPreorder?: boolean
}

interface CartContextValue {
  items: CartItem[]
  buyNowItems: CartItem[] | null
  wishlist: string[]
  hydrated: boolean
  addToCart: (
    product: Product,
    size: number,
    quantity?: number,
    variantId?: string,
  ) => void
  startBuyNow: (
    product: Product,
    size: number,
    quantity?: number,
    variantId?: string,
  ) => void
  clearBuyNow: () => void
  removeFromCart: (productId: string, size: number) => void
  updateQuantity: (productId: string, size: number, quantity: number) => void
  toggleWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  cartCount: number
  cartTotal: number
  cartWeightKg: number
  hasPreorderItems: boolean
  hasRegularItems: boolean
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const CART_STORAGE_KEY = 'viable-cart'
const BUY_NOW_STORAGE_KEY = 'viable-buy-now'
const WISHLIST_STORAGE_KEY = 'viable-wishlist'

type PersistedCartItem = {
  product: Product
  size: number
  quantity: number
  variantId?: string
  isPreorder?: boolean
}

function readJson<T>(key: string, fallback: T, storage: Storage): T {
  try {
    const raw = storage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown, storage: Storage) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

function resolveVariant(
  product: Product,
  size: number,
  variantId?: string,
) {
  if (variantId) {
    const exact = product.variants.find((v) => v.id === variantId)
    if (exact) return exact
  }

  const inStock = product.variants.find(
    (v) => v.sizeEu === size && v.stock > 0,
  )
  if (inStock) return inStock

  if (isProductPreorderEnabled(product.preorderEnabled)) {
    return product.variants.find((v) => v.sizeEu === size)
  }

  return undefined
}

function buildCartLine(
  product: Product,
  size: number,
  quantity: number,
  variantId?: string,
): CartItem {
  const variant = resolveVariant(product, size, variantId)
  const isPreorder = Boolean(
    variant &&
      variant.stock < 1 &&
      isProductPreorderEnabled(product.preorderEnabled),
  )
  return {
    product,
    size,
    quantity,
    variantId: variant?.id ?? variantId,
    isPreorder,
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [buyNowItems, setBuyNowItems] = useState<CartItem[] | null>(null)
  const [wishlist, setWishlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const storedItems = readJson<PersistedCartItem[]>(
      CART_STORAGE_KEY,
      [],
      window.localStorage,
    )
    const storedWishlist = readJson<string[]>(
      WISHLIST_STORAGE_KEY,
      [],
      window.localStorage,
    )
    const storedBuyNow = readJson<PersistedCartItem[] | null>(
      BUY_NOW_STORAGE_KEY,
      null,
      window.sessionStorage,
    )
    if (Array.isArray(storedItems)) setItems(storedItems)
    if (Array.isArray(storedWishlist)) setWishlist(storedWishlist)
    if (Array.isArray(storedBuyNow) && storedBuyNow.length > 0) {
      setBuyNowItems(storedBuyNow)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writeJson(CART_STORAGE_KEY, items, window.localStorage)
  }, [items, hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (buyNowItems && buyNowItems.length > 0) {
      writeJson(BUY_NOW_STORAGE_KEY, buyNowItems, window.sessionStorage)
    } else {
      try {
        window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [buyNowItems, hydrated])

  useEffect(() => {
    if (!hydrated) return
    writeJson(WISHLIST_STORAGE_KEY, wishlist, window.localStorage)
  }, [wishlist, hydrated])

  const addToCart = useCallback(
    (
      product: Product,
      size: number,
      quantity = 1,
      variantId?: string,
    ) => {
      const line = buildCartLine(product, size, quantity, variantId)

      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.product.id === product.id &&
            i.size === size &&
            i.variantId === line.variantId,
        )
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id &&
            i.size === size &&
            i.variantId === line.variantId
              ? {
                  ...i,
                  quantity: i.quantity + quantity,
                  isPreorder: line.isPreorder,
                  product,
                }
              : i,
          )
        }
        return [...prev, line]
      })
    },
    [],
  )

  const startBuyNow = useCallback(
    (
      product: Product,
      size: number,
      quantity = 1,
      variantId?: string,
    ) => {
      const next: CartItem[] = [
        buildCartLine(product, size, quantity, variantId),
      ]
      // Persist before navigation so /checkout never races an empty bag.
      writeJson(BUY_NOW_STORAGE_KEY, next, window.sessionStorage)
      setBuyNowItems(next)
    },
    [],
  )

  const clearBuyNow = useCallback(() => {
    try {
      window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
    } catch {
      // ignore
    }
    setBuyNowItems(null)
  }, [])

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

  const hasPreorderItems = useMemo(
    () => items.some((i) => i.isPreorder),
    [items],
  )

  const hasRegularItems = useMemo(
    () => items.some((i) => !i.isPreorder),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      buyNowItems,
      wishlist,
      hydrated,
      addToCart,
      startBuyNow,
      clearBuyNow,
      removeFromCart,
      updateQuantity,
      toggleWishlist,
      isWishlisted,
      cartCount,
      cartTotal,
      cartWeightKg,
      hasPreorderItems,
      hasRegularItems,
      clearCart,
    }),
    [
      items,
      buyNowItems,
      wishlist,
      hydrated,
      addToCart,
      startBuyNow,
      clearBuyNow,
      removeFromCart,
      updateQuantity,
      toggleWishlist,
      isWishlisted,
      cartCount,
      cartTotal,
      cartWeightKg,
      hasPreorderItems,
      hasRegularItems,
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
