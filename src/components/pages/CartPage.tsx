'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { formatPrice } from '@/lib/brand'
import { EASE_OUT } from '@/lib/motion'
import { useCart } from '@/context/CartContext'

export function CartPage() {
  const { items, updateQuantity, removeFromCart, cartTotal, clearCart, hydrated } =
    useCart()
  const reduceMotion = useReducedMotion()

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 md:px-6 md:py-14">
        <div className="h-10 w-48 rounded-lg bg-cloud/80" />
        <div className="mt-10 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-cloud py-4">
              <div className="h-20 w-20 rounded-lg bg-cloud/70" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-cloud/60" />
                <div className="h-3 w-1/4 rounded bg-cloud/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Your bag is empty
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Find your next pair — foam, crocs, slides & more.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
        >
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Your bag
        </h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-[13px] font-medium text-mute hover:text-spark"
        >
          Clear all
        </button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-cloud border-y border-cloud">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.li
                key={`${item.product.id}-${item.size}-${item.variantId}`}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{
                  duration: 0.28,
                  delay: reduceMotion ? 0 : index * 0.03,
                  ease: EASE_OUT,
                }}
                className="flex items-center gap-3 py-4 sm:gap-5"
              >
                <Link
                  href={`/product/${item.product.slug}`}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white sm:h-20 sm:w-20"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-full w-full object-contain"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="text-[14px] font-semibold text-ink hover:text-navy sm:text-[15px]"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-mute sm:text-[13px]">
                    Size EU {item.size}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
                  <div className="inline-flex items-center rounded-full border border-cloud">
                    <button
                      type="button"
                      aria-label="Decrease"
                      className="flex h-8 w-8 items-center justify-center"
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.size,
                          item.quantity - 1,
                        )
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-[13px] font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase"
                      className="flex h-8 w-8 items-center justify-center"
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.size,
                          item.quantity + 1,
                        )
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="min-w-[4.5rem] text-right text-[14px] font-semibold sm:min-w-[5.5rem] sm:text-[15px]">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeFromCart(item.product.id, item.size)}
                    className="text-mute transition hover:text-spark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <aside className="h-fit rounded-2xl bg-mist/80 p-5 lg:sticky lg:top-28 lg:p-6">
          <h2 className="text-[15px] font-semibold">Order summary</h2>
          <div className="mt-4 flex justify-between text-[14px]">
            <span className="text-mute">Subtotal</span>
            <span className="font-semibold">{formatPrice(cartTotal)}</span>
          </div>
          <p className="mt-2 text-[12px] text-mute">
            Delivery is calculated at checkout with Pathao.
          </p>
          <Link
            href="/checkout"
            className="mt-5 flex w-full items-center justify-center rounded-full bg-navy py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
          >
            Checkout
          </Link>
          <Link
            href="/shop"
            className="mt-3 block text-center text-[13px] font-medium text-navy underline-offset-4 hover:underline"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  )
}
