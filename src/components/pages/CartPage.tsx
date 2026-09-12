'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { useCart } from '@/context/CartContext'

export function CartPage() {
  const { items, updateQuantity, removeFromCart, cartTotal, clearCart } =
    useCart()

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
          {items.map((item) => (
            <li
              key={`${item.product.id}-${item.size}`}
              className="flex gap-4 py-6 sm:gap-6"
            >
              <Link
                href={`/product/${item.product.slug}`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white sm:h-28 sm:w-28"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-full w-full object-contain"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-[15px] font-semibold text-ink hover:text-navy"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-1 text-[13px] text-mute">
                      Size EU {item.size}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-full border border-cloud">
                    <button
                      type="button"
                      aria-label="Decrease"
                      className="flex h-9 w-9 items-center justify-center"
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
                    <span className="min-w-8 text-center text-[13px] font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase"
                      className="flex h-9 w-9 items-center justify-center"
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
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeFromCart(item.product.id, item.size)}
                    className="text-mute transition hover:text-spark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl bg-mist/80 p-6 lg:sticky lg:top-28">
          <h2 className="text-[15px] font-semibold">Order summary</h2>
          <div className="mt-5 space-y-3 text-[14px]">
            <div className="flex justify-between text-mute">
              <span>Subtotal</span>
              <span className="font-medium text-ink">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-mute">
              <span>Delivery</span>
              <span className="font-medium text-ink">
                {cartTotal >= 3000 ? 'Free' : formatPrice(120)}
              </span>
            </div>
            <div className="flex justify-between border-t border-cloud pt-3 text-[16px] font-semibold text-ink">
              <span>Total</span>
              <span>
                {formatPrice(cartTotal + (cartTotal >= 3000 ? 0 : 120))}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="mt-6 w-full rounded-full bg-navy py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
          >
            Checkout via WhatsApp
          </button>
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
