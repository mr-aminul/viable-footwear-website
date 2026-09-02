import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '../data/products'

export interface CartItem {
  product: Product
  size: number
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  wishlist: string[]
  addToCart: (product: Product, size: number, quantity?: number) => void
  removeFromCart: (productId: string, size: number) => void
  updateQuantity: (productId: string, size: number, quantity: number) => void
  toggleWishlist: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  cartCount: number
  cartTotal: number
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])

  const addToCart = useCallback(
    (product: Product, size: number, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) => i.product.id === product.id && i.size === size,
        )
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id && i.size === size
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        }
        return [...prev, { product, size, quantity }]
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

  const value = useMemo(
    () => ({
      items,
      wishlist,
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleWishlist,
      isWishlisted,
      cartCount,
      cartTotal,
      clearCart,
    }),
    [
      items,
      wishlist,
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleWishlist,
      isWishlisted,
      cartCount,
      cartTotal,
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
