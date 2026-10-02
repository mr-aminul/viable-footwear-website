'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Heart,
  Info,
  RotateCcw,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { productBadgeClassName } from '@/lib/catalog/badge'
import { DiscountChip } from '@/components/DiscountChip'
import { galleryForColorway } from '@/lib/catalog/gallery'
import { colorwayKey } from '@/lib/catalog/colorway'
import { productColorways } from '@/lib/catalog/product-colorways'
import { formatSizeLabel } from '@/lib/catalog/sizing'
import type { Product } from '@/lib/catalog/types'
import { enterTransition } from '@/lib/motion'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { ProductAccordion } from '@/components/ProductAccordion'
import { ProductCard } from '@/components/ProductCard'
import { ProductImageZoom } from '@/components/ProductImageZoom'
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
  const { addToCart, startBuyNow, toggleWishlist, isWishlisted } = useCart()
  const { productPromises } = useSiteSettings()
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [size, setSize] = useState<number | null>(null)
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('EU')
  const [colorIndex, setColorIndex] = useState<number | null>(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)

  const colorOptions = useMemo(() => productColorways(product), [product])

  const selectedColor =
    colorIndex != null ? colorOptions[colorIndex] : undefined
  const hasSingleColor = colorOptions.length <= 1
  const sizesForColor = useMemo(() => {
    if (!selectedColor) return product.sizes
    const matched = product.variants
      .filter((v) => colorwayKey(v.color) === selectedColor.key)
      .map((v) => v.sizeEu)
      .filter((s) => s > 0)
    return matched.length > 0
      ? [...new Set(matched)].sort((a, b) => a - b)
      : product.sizes
  }, [product, selectedColor])

  const inStockSizesForColor = useMemo(() => {
    const matched = product.variants
      .filter((v) => {
        if (v.stock < 1 || v.sizeEu <= 0) return false
        if (!selectedColor) return true
        return colorwayKey(v.color) === selectedColor.key
      })
      .map((v) => v.sizeEu)
    return [...new Set(matched)].sort((a, b) => a - b)
  }, [product.variants, selectedColor])

  const isSizeAvailable = (sizeEu: number) =>
    inStockSizesForColor.includes(sizeEu)

  const hasSingleSize =
    sizesForColor.length === 1 && inStockSizesForColor.length === 1
  const showColorPicker = colorOptions.length > 1
  // Show the grid when there are multiple sizes, or a lone out-of-stock size
  // so shoppers can still see what exists but is unavailable.
  const showSizePicker =
    product.requiresSize !== false &&
    (sizesForColor.length > 1 ||
      (sizesForColor.length === 1 && inStockSizesForColor.length === 0))
  const isProductUnavailable = useMemo(
    () =>
      product.variants.length === 0 ||
      product.variants.every((variant) => variant.stock < 1),
    [product.variants],
  )

  // Colorway can be fully sold out even when other colors still have stock.
  const hasSelectableVariant = useMemo(() => {
    if (product.requiresSize !== false) {
      return inStockSizesForColor.length > 0
    }
    return product.variants.some(
      (variant) =>
        variant.stock >= 1 &&
        (!selectedColor || colorwayKey(variant.color) === selectedColor.key),
    )
  }, [
    product.requiresSize,
    product.variants,
    inStockSizesForColor,
    selectedColor,
  ])

  const isPurchaseUnavailable = isProductUnavailable || !hasSelectableVariant
  const unavailableMessage = isProductUnavailable
    ? 'This product is currently unavailable.'
    : showColorPicker
      ? 'This color is currently unavailable. Try another color.'
      : 'This product is currently out of stock.'

  // Sole color / size are locked in — shopper never needs to tap them.
  useEffect(() => {
    if (colorOptions.length === 1) setColorIndex(0)
  }, [colorOptions.length])

  useEffect(() => {
    if (product.requiresSize === false) return
    if (hasSingleSize) {
      setSize(inStockSizesForColor[0]!)
      return
    }
    // Drop a size that no longer exists or is out of stock for the new colorway.
    if (size != null && !inStockSizesForColor.includes(size)) {
      setSize(null)
    }
  }, [product.requiresSize, hasSingleSize, inStockSizesForColor, size])

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

  const resolveSelectedVariant = () => {
    const color =
      selectedColor ??
      (colorOptions.length === 1 ? colorOptions[0] : undefined)
    const resolvedSize =
      size ??
      (product.requiresSize !== false && hasSingleSize
        ? inStockSizesForColor[0]!
        : null)

    if (product.requiresSize !== false) {
      if (resolvedSize == null) {
        setError('Select a size')
        return null
      }

      const variant =
        product.variants.find((v) => {
          return (
            v.sizeEu === resolvedSize &&
            (!color || colorwayKey(v.color) === color.key) &&
            v.stock > 0
          )
        }) ??
        product.variants.find(
          (v) => v.sizeEu === resolvedSize && v.stock > 0,
        )

      if (!variant) {
        setError('That size is out of stock')
        return null
      }

      setError('')
      return variant
    }

    const variant =
      product.variants.find((v) => {
        return (
          (!color || colorwayKey(v.color) === color.key) && v.stock > 0
        )
      }) ?? product.variants.find((v) => v.stock > 0)

    if (!variant) {
      setError('Out of stock')
      return null
    }

    setError('')
    return variant
  }

  const trackSelectedVariantAdd = (variantSize: number) => {
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      item_category: product.categoryLabel || product.category,
      price: product.price,
      quantity: 1,
      item_variant: [
        selectedColor?.name,
        product.requiresSize !== false ? `EU ${variantSize}` : null,
      ]
        .filter(Boolean)
        .join(' / '),
    })
  }

  const handleAdd = () => {
    if (isPurchaseUnavailable) return
    const variant = resolveSelectedVariant()
    if (!variant) return

    addToCart(product, variant.sizeEu, 1, variant.id)
    trackSelectedVariantAdd(variant.sizeEu)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (isPurchaseUnavailable) return
    const variant = resolveSelectedVariant()
    if (!variant) return

    startBuyNow(product, variant.sizeEu, 1, variant.id)
    trackSelectedVariantAdd(variant.sizeEu)
    router.push('/checkout')
  }

  return (
    <div className="mx-auto w-[90%] py-6 md:py-8">
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

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[auto_minmax(22rem,1fr)] lg:items-start lg:gap-10 xl:gap-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={enterTransition(reduceMotion)}
          className="min-w-0 max-w-full lg:sticky lg:top-[calc(4.5rem+1rem)] lg:w-max"
        >
          {/*
            Square frame sized to leftover viewport height. Thumbs are capped to
            the same height (scrollable) so they never stretch the main image.
          */}
          <div className="flex max-w-full items-start gap-3">
            {gallery.length > 0 ? (
              <div
                className="flex w-14 shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain sm:w-16"
                style={{ maxHeight: 'calc(100svh - 13rem)' }}
              >
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border bg-white ${
                      imageIndex === i ? 'border-navy' : 'border-cloud'
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            <div
              className="relative shrink-0 overflow-hidden rounded-[1.5rem] bg-white"
              style={{
                width: 'calc(100svh - 13rem)',
                maxWidth: '100%',
                aspectRatio: '1 / 1',
                height: 'auto',
              }}
            >
              <ProductImageZoom
                src={
                  gallery[Math.min(imageIndex, gallery.length - 1)] ??
                  product.image
                }
                alt={product.name}
              >
                {product.badge ? (
                  <span
                    className={`absolute left-4 top-4 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${productBadgeClassName(product.badge)}`}
                  >
                    {product.badge}
                  </span>
                ) : null}
              </ProductImageZoom>
            </div>
          </div>
          {product.videoUrl ? (
            <video
              controls
              className="mt-3 w-full max-w-[calc(100svh-13rem)] rounded-[1.25rem] bg-ink/5"
              src={product.videoUrl}
            />
          ) : null}
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enterTransition(reduceMotion, 0.08)}
          className="min-w-0"
        >
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            {product.name}
          </h1>
          {product.subtitle ? (
            <p className="mt-1 text-[15px] text-mute">{product.subtitle}</p>
          ) : (
            <p className="mt-1 text-[15px] text-mute">{product.categoryLabel}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-ink">
              {formatPrice(product.price)}
            </span>
            {product.compareAt ? (
              <span className="text-[16px] text-mute line-through">
                {formatPrice(product.compareAt)}
              </span>
            ) : null}
            <DiscountChip price={product.price} compareAt={product.compareAt} />
          </div>
          <p className="mt-1 text-[12px] text-mute">
            Prices in BDT · Delivery calculated at checkout
          </p>

          {showColorPicker ? (
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
                      setError('')
                    }}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                      colorIndex === i
                        ? 'border-navy'
                        : 'border-cloud hover:border-navy/40'
                    }`}
                    aria-pressed={colorIndex === i}
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : c.colorHex ? (
                      <span
                        className="absolute inset-0"
                        style={{ backgroundColor: c.colorHex }}
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
          ) : hasSingleColor && colorOptions[0]?.name ? (
            <p className="mt-8 text-[13px] font-semibold text-ink">
              Color
              <span className="font-normal text-mute">
                : {colorOptions[0].name}
              </span>
            </p>
          ) : null}

          {isPurchaseUnavailable ? (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-spark/10 px-3.5 py-3 text-[13px] leading-snug text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-spark" />
              <p>{unavailableMessage}</p>
            </div>
          ) : null}

          {product.note ? (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-3 text-[13px] leading-snug text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <p>{product.note}</p>
            </div>
          ) : null}

          {product.requiresSize !== false ? (
            <div className="mt-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">
                  Size
                  <span className="font-normal text-mute">
                    :{' '}
                    {size != null
                      ? formatSizeLabel(size, sizeUnit)
                      : !hasSelectableVariant
                        ? 'Unavailable'
                        : showSizePicker
                          ? 'Please select'
                          : hasSingleSize
                            ? formatSizeLabel(sizesForColor[0]!, sizeUnit)
                            : 'Please select'}
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
                  {showSizePicker ? (
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
                  ) : null}
                </div>
              </div>
              {showSizePicker ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sizesForColor.map((s) => {
                    const available = isSizeAvailable(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          if (!available) return
                          setSize(s)
                          setError('')
                        }}
                        className={`group relative min-w-12 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition ${
                          !available
                            ? 'cursor-not-allowed border-cloud/70 bg-mist/40 text-mute line-through opacity-45'
                            : size === s
                              ? 'border-navy bg-navy text-white'
                              : 'border-cloud bg-white text-ink hover:border-navy/40'
                        }`}
                        aria-pressed={available ? size === s : undefined}
                        aria-disabled={!available}
                        aria-label={
                          available
                            ? formatSizeLabel(s, sizeUnit)
                            : `${formatSizeLabel(s, sizeUnit)} — Unavailable`
                        }
                        title={available ? undefined : 'Unavailable'}
                      >
                        {formatSizeLabel(s, sizeUnit)}
                        {!available ? (
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          >
                            Unavailable
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
              {error && !isPurchaseUnavailable ? (
                <p className="mt-2 text-[13px] text-spark">{error}</p>
              ) : null}
            </div>
          ) : error && !isPurchaseUnavailable ? (
            <p className="mt-4 text-[13px] text-spark">{error}</p>
          ) : null}

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
              disabled={isPurchaseUnavailable}
              className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-full border border-cloud bg-white px-6 py-3.5 text-[14px] font-semibold text-ink transition hover:border-navy/30 hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-cloud disabled:hover:bg-white sm:flex-none"
            >
              {isPurchaseUnavailable ? (
                'Out of stock'
              ) : added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Add to cart
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isPurchaseUnavailable}
              className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-navy sm:flex-none"
            >
              {isPurchaseUnavailable ? 'Out of stock' : 'Buy now'}
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
