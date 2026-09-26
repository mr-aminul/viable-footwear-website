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
import { galleryForColorway } from '@/lib/catalog/gallery'
import { colorwayKey } from '@/lib/catalog/colorway'
import { formatSizeLabel } from '@/lib/catalog/sizing'
import type { Product } from '@/lib/catalog/types'
import { enterTransition } from '@/lib/motion'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { ProductAccordion } from '@/components/ProductAccordion'
import { ProductCard } from '@/components/ProductCard'
import { SizeGuideDrawer } from '@/components/SizeGuideDrawer'
import { trackAddToCart, trackViewItem } from '@/lib/analytics/events'

type SizeUnit = 'EU' | 'UK'

export function ProductPage({
  product,
  related,
}: {
  product: Product
  related: Product[]
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const { productPromises } = useSiteSettings()
  const reduceMotion = useReducedMotion()
  const [size, setSize] = useState<number | null>(null)
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('EU')
  const [colorIndex, setColorIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)

  const colorOptions = useMemo(() => {
    const unique = new Map<
      string,
      { name: string | null; thumb: string | null }
    >()
    for (const variant of product.variants) {
      const key = colorwayKey(variant.color)
      const existing = unique.get(key)
      if (!existing) {
        unique.set(key, {
          name: variant.color?.trim() || null,
          thumb: variant.imageUrl,
        })
      } else if (!existing.thumb && variant.imageUrl) {
        existing.thumb = variant.imageUrl
      }
    }
    if (unique.size === 0 && product.colors.length > 0) {
      product.colors.forEach((c) =>
        unique.set(colorwayKey(c), { name: c, thumb: null }),
      )
    }
    return [...unique.entries()].map(([key, value]) => ({
      key,
      name: value.name,
      thumb: value.thumb,
    }))
  }, [product])

  const selectedColor = colorOptions[colorIndex]
  const sizesForColor = useMemo(() => {
    if (!selectedColor) return product.sizes
    const matched = product.variants
      .filter((v) => {
        return colorwayKey(v.color) === selectedColor.key && v.stock > 0
      })
      .map((v) => v.sizeEu)
    return matched.length > 0
      ? [...new Set(matched)].sort((a, b) => a - b)
      : product.sizes
  }, [product, selectedColor])

  const gallery = useMemo(() => {
    return galleryForColorway(
      product.variants,
      product.images,
      selectedColor?.key ?? null,
      product.image,
    )
  }, [product.images, product.image, product.variants, selectedColor])

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
    if (size == null) {
      setError('Select a size')
      return
    }

    const variant =
      product.variants.find((v) => {
        return (
          v.sizeEu === size &&
          (!selectedColor || colorwayKey(v.color) === selectedColor.key) &&
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
      item_variant: [selectedColor?.name, `EU ${size}`]
        .filter(Boolean)
        .join(' / '),
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  const ctaLabel =
    size == null ? 'Choose size' : added ? 'Added' : 'Add to bag'

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
          <div className="flex gap-3">
            {gallery.length > 1 ? (
              <div className="flex max-h-[min(100vw-2rem,36rem)] w-16 shrink-0 flex-col gap-2 overflow-y-auto md:max-h-[min(100%,28rem)] lg:max-h-none lg:self-stretch">
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`aspect-square w-full shrink-0 overflow-hidden rounded-xl border bg-white ${
                      imageIndex === i ? 'border-navy' : 'border-cloud'
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="relative min-w-0 flex-1 aspect-square overflow-hidden rounded-[1.5rem] bg-white">
              <img
                src={
                  gallery[Math.min(imageIndex, gallery.length - 1)] ??
                  product.image
                }
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
          </div>
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

          {product.reviews > 0 ? (
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
          ) : null}

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
            Prices in BDT · Delivery calculated at checkout
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
                      <span className="flex h-full w-full items-center justify-center bg-mist text-[10px] font-semibold uppercase text-mute">
                        {(c.name ?? '?').slice(0, 2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {product.note ? (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-3 text-[13px] leading-snug text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <p>{product.note}</p>
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
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-[12px] font-medium text-navy underline-offset-2 hover:underline"
                >
                  Size guide
                </button>
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
                <span className="font-semibold text-ink">
                  {productPromises.deliveryLabel}{' '}
                </span>
                {productPromises.deliveryText}
              </span>
            </li>
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">
                  {productPromises.returnsLabel}{' '}
                </span>
                {productPromises.returnsText}
              </span>
            </li>
            <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <span>
                <span className="font-semibold text-ink">
                  {productPromises.authenticLabel}{' '}
                </span>
                {productPromises.authenticText}
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
            {product.reviews > 0 ? (
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
                <p className="mt-2 text-mute">
                  Individual review write-ups are not shown yet — the score above
                  reflects store feedback.
                </p>
              </ProductAccordion>
            ) : null}
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
