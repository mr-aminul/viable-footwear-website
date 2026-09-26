'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import type { Product } from '@/lib/catalog/types'
import { ProductCard } from '@/components/ProductCard'
import { useCart } from '@/context/CartContext'

export function WishlistPage({ products }: { products: Product[] }) {
  const { wishlist, hydrated, toggleWishlist } = useCart()

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 md:px-6 md:py-14">
        <div className="h-10 w-48 rounded-lg bg-cloud/80" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[1.35rem] bg-cloud/60" />
          ))}
        </div>
      </div>
    )
  }

  const wished = products.filter((p) => wishlist.includes(p.id))

  if (wished.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-6">
        <Heart className="mx-auto h-10 w-10 text-mute" />
        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight">
          Your wishlist is empty
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Tap the heart on any style to save it here (saved on this device).
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
        >
          Browse shop
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Wishlist
          </h1>
          <p className="mt-2 text-[15px] text-mute">
            {wished.length} saved {wished.length === 1 ? 'style' : 'styles'} on
            this device
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            for (const id of [...wishlist]) toggleWishlist(id)
          }}
          className="text-[13px] font-medium text-mute hover:text-spark"
        >
          Clear wishlist
        </button>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {wished.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </div>
  )
}
