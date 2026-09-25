'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Heart,
  Info,
  RotateCcw,
  Star,
  Truck,
} from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { productBadgeClassName } from '@/lib/catalog/badge'
import { galleryForColor } from '@/lib/catalog/gallery'
import { formatSizeLabel, widthLabel } from '@/lib/catalog/sizing'
import type { Product, ProductWidth } from '@/lib/catalog/types'
import { enterTransition } from '@/lib/motion'
import { useCart } from '@/context/CartContext'
import { ProductAccordion } from '@/components/ProductAccordion'
import { ProductCard } from '@/components/ProductCard'
import { SizeGuideDrawer } from '@/components/SizeGuideDrawer'
import { trackAddToCart, trackViewItem } from '@/lib/analytics/events'

type SizeUnit = 'EU' | 'UK'

function WidthGlyph({ width, active }: { width: ProductWidth; active: boolean }) {
  const fill = active ? 'currentColor' : 'none'
  const stroke = 'currentColor'
  return (
    <svg
      viewBox="0 0 32 40"
      className="h-8 w-6"
      aria-hidden
      fill={fill}
      stroke={stroke}
      strokeWidth={1.5}
    >
      {width === 'normal' ? (
        <path d="M16 3c5.5 0 10 5.2 10 12.5 0 5.2-2.2 9.4-5.2 14.2-1.4 2.2-2.6 4.4-2.9 6.3h-3.8c-.3-1.9-1.5-4.1-2.9-6.3C8.2 24.9 6 20.7 6 15.5 6 8.2 10.5 3 16 3z" />
      ) : (
        <path d="M16 5c4.2 0 7.5 4.2 7.5 10 0 4.4-1.8 7.8-4.2 11.8-1.1 1.8-2 3.5-2.3 5.2h-2c-.3-1.7-1.2-3.4-2.3-5.2C10.3 22.8 8.5 19.4 8.5 15 8.5 9.2 11.8 5 16 5z" />
      )}
    </svg>
  )
}

export function ProductPage({
  product,
  related,
}: {
  product: Product
  related: Product[]
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const reduceMotion = useReducedMotion()
  const [size, setSize] = useState<number | null>(null)
  const [width, setWidth] = useState<ProductWidth | null>(null)
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('EU')
  const [colorIndex, setColorIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)

  const colorOptions = useMemo(() => {
    const unique = new Map<string, { hex: string; name: string | null }>()
    for (const variant of product.variants) {
      const key = variant.colorHex || variant.color || 'default'
      if (!unique.has(key)) {
        unique.set(key, {
          hex: variant.colorHex || variant.color || '#1A3668',
          name: variant.color,
        })
      }
    }
    if (unique.size === 0 && product.colors.length > 0) {
      product.colors.forEach((c, i) =>
        unique.set(String(i), { hex: c, name: null }),
      )
    }
    return [...unique.entries()].map(([key, value]) => ({
      key,
      hex: value.hex,
      name: value.name,
      thumb:
        galleryForColor(product.images, value.hex)[0] ?? product.image,
    }))
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

  const offersWidth = (product.widths?.length ?? 0) > 0

  useEffect(() => {
    setImageIndex(0)
  }, [selectedColor?.key])

  const wished = isWishlisted(product.id)

  useEffect(() => {
    trackViewItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.categoryLabel || product.category,
      price: product.price,
      quantity: 1,
    })
  }, [product.id, product.name, product.category, product.categoryLabel, product.price])

  const handleAdd = () => {
    if (offersWidth && width == null) {
      setError('Select a width')
      return
    }
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
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      item_category: product.categoryLabel || product.category,
      price: product.price,
      quantity: 1,
      item_variant: [
        selectedColor?.name,
        width ? widthLabel(width) : null,
        `EU ${size}`,
      ]
        .filter(Boolean)
        .join(' / '),
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  const ctaLabel =
    offersWidth && width == null
      ? 'Choose width'
      : size == null
        ? 'Choose size'
        : added
          ? 'Added'
          : 'Add to bag'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute"
      >
        <Link href="/" className="transition hover:text-ink">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/shop" className="transition hover:text-ink">
          Shop
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/shop?category=${product.category}`}
          className="transition hover:text-ink"
        >
          {product.categoryLabel}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <Link
        href="/shop"
        className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-mute transition hover:text-ink md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to shop
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={enterTransition(reduceMotion)}
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
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enterTransition(reduceMotion, 0.08)}
        >
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            {product.name}
          </h1>
          {product.subtitle ? (
            <p className="mt-1 text-[15px] text-mute">{product.subtitle}</p>
          ) : (
            <p className="mt-1 text-[15px] text-mute">{product.categoryLabel}</p>
          )}

          <a
            href="#product-reviews"
            className="mt-3 inline-flex items-center gap-2 transition hover:opacity-80"
          >
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="text-[14px] font-medium">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-[14px] text-mute">
              ({product.reviews} reviews)
            </span>
          </a>

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
          <p className="mt-1 text-[12px] text-mute">
            Incl. VAT · Free delivery across Bangladesh
          </p>

          {colorOptions.length > 0 ? (
            <div className="mt-8">
              <p className="text-[13px] font-semibold text-ink">
                Color
                {selectedColor?.name ? (
                  <span className="font-normal text-mute">
                    : {selectedColor.name}
                  </span>
                ) : null}
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {colorOptions.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-label={c.name ? `Color ${c.name}` : `Color ${i + 1}`}
                    title={c.name ?? undefined}
                    onClick={() => {
                      setColorIndex(i)
                      setSize(null)
                      setImageIndex(0)
                    }}
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                      colorIndex === i
                        ? 'border-navy'
                        : 'border-cloud hover:border-navy/40'
                    }`}
                  >
                    {c.thumb ? (
                      <img
                        src={c.thumb}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span
                        className="block h-full w-full"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {product.fitNote ? (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-3 text-[13px] leading-snug text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <p>{product.fitNote}</p>
            </div>
          ) : null}

          {offersWidth ? (
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">
                  Width
                  <span className="font-normal text-mute">
                    : {width ? widthLabel(width) : 'Please select'}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-[12px] font-medium text-navy underline-offset-2 hover:underline"
                >
                  Size guide
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(product.widths ?? []).map((w) => {
                  const active = width === w
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        setWidth(w)
                        setError('')
                      }}
                      className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-3.5 text-[13px] font-medium transition ${
                        active
                          ? 'border-navy bg-navy text-white'
                          : 'border-cloud bg-white text-ink hover:border-navy/40'
                      }`}
                    >
                      <WidthGlyph width={w} active={active} />
                      {widthLabel(w)}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink">
                Size
                <span className="font-normal text-mute">
                  : {size != null ? formatSizeLabel(size, sizeUnit) : 'Please select'}
                </span>
              </p>
              <div className="flex items-center gap-3">
                {!offersWidth ? (
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[12px] font-medium text-navy underline-offset-2 hover:underline"
                  >
                    Size guide
                  </button>
                ) : null}
                <div
                  role="group"
                  aria-label="Size unit"
                  className="inline-flex rounded-full border border-cloud p-0.5 text-[11px] font-semibold"
                >
                  {(['EU', 'UK'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setSizeUnit(unit)}
                      className={`rounded-full px-2.5 py-1 transition ${
                        sizeUnit === unit
                          ? 'bg-navy text-white'
                          : 'text-mute hover:text-ink'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
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
                  {formatSizeLabel(s, sizeUnit)}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 text-[13px] text-spark">{error}</p>}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
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
                ctaLabel
              )}
            </button>
          </div>

          <ul className="mt-8 space-y-3">
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">Delivery: </span>
                24hrs within Dhaka, 48–72hrs outside Dhaka
              </span>
            </li>
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">Free returns: </span>
                7-day return policy on unused pairs
              </span>
            </li>
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">Authentic: </span>
                Genuine footwear, curated for Bangladesh
              </span>
            </li>
          </ul>

          <div className="mt-10 border-t border-cloud">
            <ProductAccordion title="Product description" defaultOpen>
              <p className="whitespace-pre-wrap">{product.description}</p>
            </ProductAccordion>
            {product.materials ? (
              <ProductAccordion title="Materials">
                <p className="whitespace-pre-wrap">{product.materials}</p>
              </ProductAccordion>
            ) : null}
            {product.careInfo ? (
              <ProductAccordion title="Care & safety">
                <p className="whitespace-pre-wrap">{product.careInfo}</p>
              </ProductAccordion>
            ) : null}
            <ProductAccordion title="Reviews" id="product-reviews">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-gold text-gold" />
                <span className="font-medium text-ink">
                  {product.rating.toFixed(1)}
                </span>
                <span>
                  based on {product.reviews}{' '}
                  {product.reviews === 1 ? 'review' : 'reviews'}
                </span>
              </div>
              <p className="mt-2">
                Detailed customer reviews will appear here as they come in.
              </p>
            </ProductAccordion>
          </div>

          <p className="mt-6 text-[13px]">
            <span className="text-mute">More from: </span>
            <Link
              href={`/shop?category=${product.category}`}
              className="font-medium text-navy underline-offset-2 hover:underline"
            >
              {product.categoryLabel}
            </Link>
          </p>
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

      <SizeGuideDrawer
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </div>
  )
}
