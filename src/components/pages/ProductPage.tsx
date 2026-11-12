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
import {
  expandProductsByColorway,
  productColorways,
  productPath,
} from '@/lib/catalog/product-colorways'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import { formatSizeLabel } from '@/lib/catalog/sizing'
import type { Product } from '@/lib/catalog/types'
import { enterTransition } from '@/lib/motion'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { ProductAccordion } from '@/components/ProductAccordion'
import { ProductCard } from '@/components/ProductCard'
import { ProductImageZoom } from '@/components/ProductImageZoom'
import { SafeImage } from '@/components/SafeImage'
import { SizeGuideDrawer } from '@/components/SizeGuideDrawer'
import { SizeOptionButton } from '@/components/SizeOptionButton'
import {
  trackAddToCart,
  trackAddToWishlist,
  trackViewItem,
} from '@/lib/analytics/events'
import {
  isProductPreorderEnabled,
  PREORDER_ADVANCE_BDT,
} from '@/lib/orders/preorder'

type SizeUnit = 'EU' | 'UK'

export function ProductPage({
  product,
  related,
  initialColor,
}: {
  product: Product
  related: Product[]
  /** Colorway key from `?color=` (PLP deep-link). */
  initialColor?: string | null
}) {
  const { addToCart, startBuyNow, toggleWishlist, isWishlisted } = useCart()
  const { productPromises } = useSiteSettings()
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [size, setSize] = useState<number | null>(null)
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('EU')
  const [imageIndex, setImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)

  const colorOptions = useMemo(() => productColorways(product), [product])

  const [colorIndex, setColorIndex] = useState<number | null>(() => {
    if (initialColor) {
      const idx = colorOptions.findIndex(
        (c) => c.key === colorwayKey(initialColor),
      )
      if (idx >= 0) return idx
    }
    return colorOptions.length > 0 ? 0 : null
  })

  const selectedColor =
    colorIndex != null ? colorOptions[colorIndex] : undefined

  const relatedListings = useMemo(
    () => expandProductsByColorway(related, RELATED_PRODUCTS_DISPLAY_CAP),
    [related],
  )
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

  const preorderEnabled = isProductPreorderEnabled(product.preorderEnabled)

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

  const preorderSizesForColor = useMemo(() => {
    if (!preorderEnabled) return [] as number[]
    const matched = product.variants
      .filter((v) => {
        if (v.stock >= 1 || v.sizeEu <= 0) return false
        if (!selectedColor) return true
        return colorwayKey(v.color) === selectedColor.key
      })
      .map((v) => v.sizeEu)
    return [...new Set(matched)].sort((a, b) => a - b)
  }, [product.variants, selectedColor, preorderEnabled])

  const selectableSizesForColor = useMemo(
    () =>
      [...new Set([...inStockSizesForColor, ...preorderSizesForColor])].sort(
        (a, b) => a - b,
      ),
    [inStockSizesForColor, preorderSizesForColor],
  )

  const isSizeInStock = (sizeEu: number) =>
    inStockSizesForColor.includes(sizeEu)
  const isSizePreorder = (sizeEu: number) =>
    !isSizeInStock(sizeEu) && preorderSizesForColor.includes(sizeEu)

  const hasSingleSize =
    sizesForColor.length === 1 && selectableSizesForColor.length === 1
  const showColorPicker = colorOptions.length > 1
  // Show the grid when there are multiple sizes, or a lone out-of-stock size
  // so shoppers can still see what exists but is unavailable.
  const showSizePicker =
    product.requiresSize !== false &&
    (sizesForColor.length > 1 ||
      (sizesForColor.length === 1 && selectableSizesForColor.length === 0))
  const isProductUnavailable = useMemo(() => {
    if (product.variants.length === 0) return true
    if (product.variants.some((variant) => variant.stock >= 1)) return false
    return !preorderEnabled
  }, [product.variants, preorderEnabled])

  // Colorway can be fully sold out even when other colors still have stock.
  const hasSelectableVariant = useMemo(() => {
    if (product.requiresSize !== false) {
      return selectableSizesForColor.length > 0
    }
    return product.variants.some((variant) => {
      const matchesColor =
        !selectedColor || colorwayKey(variant.color) === selectedColor.key
      if (!matchesColor) return false
      return variant.stock >= 1 || preorderEnabled
    })
  }, [
    product.requiresSize,
    product.variants,
    selectableSizesForColor,
    selectedColor,
    preorderEnabled,
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

  // Keep color in sync when landing from a different PLP colorway tile.
  useEffect(() => {
    if (!initialColor || colorOptions.length === 0) return
    const idx = colorOptions.findIndex(
      (c) => c.key === colorwayKey(initialColor),
    )
    if (idx >= 0) setColorIndex(idx)
  }, [initialColor, colorOptions])

  const selectColor = (index: number) => {
    const next = colorOptions[index]
    setColorIndex(index)
    setSize(null)
    setImageIndex(0)
    setError('')
    if (!next) return
    router.replace(productPath(product.slug, next.key), { scroll: false })
  }

  useEffect(() => {
    if (product.requiresSize === false) return
    if (hasSingleSize) {
      setSize(selectableSizesForColor[0]!)
      return
    }
    // Drop a size that no longer exists or cannot be bought / pre-ordered.
    if (size != null && !selectableSizesForColor.includes(size)) {
      setSize(null)
    }
  }, [product.requiresSize, hasSingleSize, selectableSizesForColor, size])

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
        ? selectableSizesForColor[0]!
        : null)

    const matchVariant = (preferInStock: boolean) => {
      if (product.requiresSize !== false) {
        if (resolvedSize == null) return null
        return (
          product.variants.find((v) => {
            const matchesSize = v.sizeEu === resolvedSize
            const matchesColor =
              !color || colorwayKey(v.color) === color.key
            const matchesStock = preferInStock ? v.stock > 0 : v.stock < 1
            return matchesSize && matchesColor && matchesStock
          }) ??
          product.variants.find((v) => {
            const matchesSize = v.sizeEu === resolvedSize
            const matchesStock = preferInStock ? v.stock > 0 : true
            return matchesSize && matchesStock
          })
        )
      }

      return (
        product.variants.find((v) => {
          const matchesColor =
            !color || colorwayKey(v.color) === color.key
          const matchesStock = preferInStock ? v.stock > 0 : v.stock < 1
          return matchesColor && matchesStock
        }) ??
        product.variants.find((v) => (preferInStock ? v.stock > 0 : true))
      )
    }

    if (product.requiresSize !== false && resolvedSize == null) {
      setError('Select a size')
      return null
    }

    const inStockVariant = matchVariant(true)
    if (inStockVariant) {
      setError('')
      return inStockVariant
    }

    if (preorderEnabled) {
      const preorderVariant = matchVariant(false)
      if (preorderVariant) {
        setError('')
        return preorderVariant
      }
    }

    setError(
      product.requiresSize !== false
        ? 'That size is out of stock'
        : 'Out of stock',
    )
    return null
  }

  // Entire colorway is sold out but still bookable — don't wait for a size tap
  // before switching CTAs from "Buy now" to "Pre-order".
  const colorwayIsPreorderOnly =
    preorderEnabled &&
    inStockSizesForColor.length === 0 &&
    preorderSizesForColor.length > 0

  const selectedIsPreorder = useMemo(() => {
    if (!preorderEnabled) return false
    if (product.requiresSize !== false) {
      if (size != null) return isSizePreorder(size)
      return colorwayIsPreorderOnly
    }
    return (
      !product.variants.some(
        (v) =>
          v.stock >= 1 &&
          (!selectedColor || colorwayKey(v.color) === selectedColor.key),
      ) && hasSelectableVariant
    )
  }, [
    preorderEnabled,
    product.requiresSize,
    product.variants,
    size,
    colorwayIsPreorderOnly,
    inStockSizesForColor,
    preorderSizesForColor,
    selectedColor,
    hasSelectableVariant,
  ])

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
                    <SafeImage
                      src={src}
                      alt=""
                      maxWidth={128}
                      loading="lazy"
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
              preload="none"
              playsInline
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
                    onClick={() => selectColor(i)}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                      colorIndex === i
                        ? 'border-navy'
                        : 'border-cloud hover:border-navy/40'
                    }`}
                    aria-pressed={colorIndex === i}
                  >
                    {c.imageUrl ? (
                      <SafeImage
                        src={c.imageUrl}
                        alt=""
                        maxWidth={96}
                        loading="lazy"
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
          ) : selectedIsPreorder ? (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-navy/5 px-3.5 py-3 text-[13px] leading-snug text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <p>
                {size != null || product.requiresSize === false
                  ? 'This size is sold out. '
                  : 'Currently sold out. '}
                Pre-order with a{' '}
                <span className="font-semibold">
                  {formatPrice(PREORDER_ADVANCE_BDT)}
                </span>{' '}
                advance — pay the rest when it ships.
              </p>
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
                  {sizesForColor.map((s) => (
                    <SizeOptionButton
                      key={s}
                      label={formatSizeLabel(s, sizeUnit)}
                      available={isSizeInStock(s)}
                      preorder={isSizePreorder(s)}
                      selected={size === s}
                      onSelect={() => {
                        setSize(s)
                        setError('')
                      }}
                    />
                  ))}
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
              onClick={() => {
                if (!wished) {
                  trackAddToWishlist({
                    item_id: product.id,
                    item_name: product.name,
                    item_category: product.categoryLabel || product.category,
                    price: product.price,
                    quantity: 1,
                  })
                }
                toggleWishlist(product.id)
              }}
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
                  {selectedIsPreorder ? 'Pre-order' : 'Add to cart'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isPurchaseUnavailable}
              className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-navy sm:flex-none"
            >
              {isPurchaseUnavailable
                ? 'Out of stock'
                : selectedIsPreorder
                  ? 'Pre-order now'
                  : 'Buy now'}
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
            {productPromises.returnsLabel || productPromises.returnsText ? (
              <li className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
                <span>
                  <span className="font-semibold text-ink">
                    {productPromises.returnsLabel}{' '}
                  </span>
                  {productPromises.returnsText}
                </span>
              </li>
            ) : null}
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
            {relatedListings.map((listing, i) => (
              <ProductCard
                key={listing.listingKey}
                product={listing.product}
                colorwayKey={listing.colorwayKey}
                index={i}
              />
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
