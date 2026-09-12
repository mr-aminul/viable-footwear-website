'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Heart, Star, Truck } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { productBadgeClassName } from '@/lib/catalog/badge'
import { galleryForColor } from '@/lib/catalog/gallery'
import type { Product } from '@/lib/catalog/types'
import { useCart } from '@/context/CartContext'
import { ProductCard } from '@/components/ProductCard'

export function ProductPage({
  product,
  related,
}: {
  product: Product
  related: Product[]
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [size, setSize] = useState<number | null>(null)
  const [colorIndex, setColorIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const colorOptions = useMemo(() => {
    const unique = new Map<string, string>()
    for (const variant of product.variants) {
      const key = variant.colorHex || variant.color || 'default'
      if (!unique.has(key)) {
        unique.set(key, variant.colorHex || variant.color || '#1A3668')
      }
    }
    if (unique.size === 0 && product.colors.length > 0) {
      product.colors.forEach((c, i) => unique.set(String(i), c))
    }
    return [...unique.entries()].map(([key, hex]) => ({ key, hex }))
  }, [product])

  const selectedColor = colorOptions[colorIndex]
  const sizesForColor = useMemo(() => {
    if (!selectedColor) return product.sizes
    const matched = product.variants
      .filter((v) => {
        const key = v.colorHex || v.color || 'default'
        return key === selectedColor.key && v.stock > 0
      })
      .map((v) => v.sizeEu)
    return matched.length > 0
      ? [...new Set(matched)].sort((a, b) => a - b)
      : product.sizes
  }, [product, selectedColor])

  const gallery = useMemo(() => {
    const urls = galleryForColor(product.images, selectedColor?.hex ?? null)
    return urls.length > 0 ? urls : [product.image]
  }, [product.images, product.image, selectedColor])

  useEffect(() => {
    setImageIndex(0)
  }, [selectedColor?.key])

  const wished = isWishlisted(product.id)

  const handleAdd = () => {
    if (size == null) {
      setError('Select a size')
      return
    }

    const variant =
      product.variants.find((v) => {
        const key = v.colorHex || v.color || 'default'
        return (
          v.sizeEu === size &&
          (!selectedColor || key === selectedColor.key) &&
          v.stock > 0
        )
      }) ??
      product.variants.find((v) => v.sizeEu === size && v.stock > 0)

    if (!variant) {
      setError('That size is out of stock')
      return
    }

    setError('')
    addToCart(product, size, 1, variant.id)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-mute transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to shop
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="space-y-3"
        >
          <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-white">
            <img
              src={gallery[Math.min(imageIndex, gallery.length - 1)] ?? product.image}
              alt={product.name}
              className="h-full w-full object-contain"
            />
            {product.badge && (
              <span
                className={`absolute left-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${productBadgeClassName(product.badge)}`}
              >
                {product.badge}
              </span>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white ${
                    imageIndex === i ? 'border-navy' : 'border-cloud'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}
          {product.videoUrl ? (
            <video
              controls
              className="w-full rounded-[1.25rem] bg-ink/5"
              src={product.videoUrl}
            />
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <p className="text-[13px] font-medium text-mute">
            {product.categoryLabel}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            {product.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="text-[14px] font-medium">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-[14px] text-mute">
              ({product.reviews} reviews)
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-ink">
              {formatPrice(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-[16px] text-mute line-through">
                {formatPrice(product.compareAt)}
              </span>
            )}
          </div>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mute">
            {product.description}
          </p>

          {colorOptions.length > 0 ? (
            <div className="mt-8">
              <p className="text-[13px] font-semibold text-ink">Color</p>
              <div className="mt-3 flex gap-2.5">
                {colorOptions.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-label={`Color ${i + 1}`}
                    onClick={() => {
                      setColorIndex(i)
                      setSize(null)
                      setImageIndex(0)
                    }}
                    className={`h-9 w-9 rounded-full border-2 transition ${
                      colorIndex === i
                        ? 'scale-110 border-navy'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: c.hex,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-7">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Size (EU)</p>
              <Link
                href="/about"
                className="text-[12px] font-medium text-navy underline-offset-2 hover:underline"
              >
                Size guide
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizesForColor.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSize(s)
                    setError('')
                  }}
                  className={`min-w-12 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition ${
                    size === s
                      ? 'border-navy bg-navy text-white'
                      : 'border-cloud bg-white text-ink hover:border-navy/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 text-[13px] text-spark">{error}</p>}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft sm:flex-none"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                'Add to bag'
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-cloud transition hover:border-navy/30"
              aria-label="Wishlist"
            >
              <Heart
                className={`h-[18px] w-[18px] ${
                  wished ? 'fill-spark text-spark' : ''
                }`}
              />
            </button>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-mist/80 px-4 py-4">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
            <p className="text-[13px] leading-relaxed text-mute">
              Delivery across Bangladesh. 24hrs within Dhaka, 48-72hrs outside
              Dhaka!
            </p>
          </div>
        </motion.div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 border-t border-cloud pt-14">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">
            You may also like
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
