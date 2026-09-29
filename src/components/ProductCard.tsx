'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Heart, ShoppingBag } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Product } from '@/lib/catalog/types'
import { productBadgeClassName } from '@/lib/catalog/badge'
import {
  productColorways,
  variantForColorway,
  type ProductColorwayOption,
} from '@/lib/catalog/product-colorways'
import { formatPrice } from '@/lib/brand'
import { DiscountChip } from '@/components/DiscountChip'
import { enterTransition, springHover } from '@/lib/motion'
import { useCart } from '@/context/CartContext'
import { trackAddToCart } from '@/lib/analytics/events'
import { sampleDominantColorFromUrl } from '@/lib/catalog/sample-dominant-color-client'

interface ProductCardProps {
  product: Product
  index?: number
  /** Visual-only tile (no cart/wishlist). For admin WYSIWYG previews. */
  preview?: boolean
}

/**
 * Merchandised product tile with wishlist + quick-add.
 */
export function ProductCard({
  product,
  index = 0,
  preview = false,
}: ProductCardProps) {
  if (preview) {
    return <ProductCardView product={product} index={index} />
  }
  return <ProductCardInteractive product={product} index={index} />
}

function ProductCardInteractive({
  product,
  index,
}: {
  product: Product
  index: number
}) {
  const { toggleWishlist, isWishlisted, addToCart } = useCart()
  const wished = isWishlisted(product.id)
  const colorways = useMemo(() => productColorways(product), [product])
  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => colorways[0]?.key ?? null,
  )

  useEffect(() => {
    if (colorways.length === 0) {
      setSelectedKey(null)
      return
    }
    if (!selectedKey || !colorways.some((c) => c.key === selectedKey)) {
      setSelectedKey(colorways[0]!.key)
    }
  }, [colorways, selectedKey])

  const selectedColorway =
    colorways.find((c) => c.key === selectedKey) ?? colorways[0]

  const defaultSize =
    product.sizes[Math.floor(product.sizes.length / 2)] ?? product.sizes[0]

  const defaultVariant = selectedColorway
    ? variantForColorway(product.variants, selectedColorway.key, defaultSize)
    : product.variants.find((v) => v.sizeEu === defaultSize && v.stock > 0) ??
      product.variants.find((v) => v.stock > 0) ??
      product.variants[0]

  const displayImage =
    selectedColorway?.imageUrl ?? product.image

  return (
    <ProductCardView
      product={product}
      index={index}
      displayImage={displayImage}
      colorways={colorways}
      selectedColorKey={selectedColorway?.key ?? null}
      onSelectColor={setSelectedKey}
      wished={wished}
      canAdd={Boolean(defaultVariant && defaultVariant.stock >= 1)}
      onToggleWishlist={() => toggleWishlist(product.id)}
      onAddToCart={() => {
        if (!defaultVariant || defaultVariant.stock < 1) return
        addToCart(product, defaultVariant.sizeEu, 1, defaultVariant.id)
        trackAddToCart({
          item_id: product.id,
          item_name: product.name,
          item_category: product.categoryLabel || product.category,
          price: product.price,
          quantity: 1,
          item_variant: product.requiresSize !== false
            ? `EU ${defaultVariant.sizeEu}`
            : defaultVariant.color?.trim() || undefined,
        })
      }}
    />
  )
}

function ProductCardView({
  product,
  index,
  displayImage,
  colorways = [],
  selectedColorKey = null,
  onSelectColor,
  wished = false,
  canAdd = true,
  onToggleWishlist,
  onAddToCart,
}: {
  product: Product
  index: number
  displayImage?: string
  colorways?: ProductColorwayOption[]
  selectedColorKey?: string | null
  onSelectColor?: (key: string) => void
  wished?: boolean
  canAdd?: boolean
  onToggleWishlist?: () => void
  onAddToCart?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const interactive = Boolean(onToggleWishlist && onAddToCart)
  const imageSrc = displayImage ?? product.image
  const selectedColorway = colorways.find((c) => c.key === selectedColorKey)
  const showSwatches = colorways.length > 1

  const media = (
    <div className="relative block aspect-square overflow-hidden">
      <img
        src={imageSrc}
        alt={
          selectedColorway?.name
            ? `${product.name} — ${selectedColorway.name}`
            : product.name
        }
        className={[
          'absolute inset-0 h-full w-full object-cover will-change-transform',
          reduceMotion
            ? ''
            : 'transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]',
        ].join(' ')}
        loading="lazy"
      />
    </div>
  )

  const title = (
    <h3 className="text-[15px] font-semibold leading-snug text-ink transition-colors duration-150 group-hover:text-navy">
      {product.name}
    </h3>
  )

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={springHover(reduceMotion)}
      viewport={{ once: true, margin: '-40px' }}
      transition={enterTransition(reduceMotion, index * 0.04)}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-card transition-shadow duration-500 ease-out hover:shadow-lift"
    >
      {product.badge && (
        <span
          className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${productBadgeClassName(product.badge)}`}
        >
          {product.badge}
        </span>
      )}

      <button
        type="button"
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        disabled={!interactive}
        onClick={(e) => {
          e.preventDefault()
          onToggleWishlist?.()
        }}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-colors duration-150 ease-out hover:bg-white disabled:pointer-events-none"
      >
        <Heart
          className={`h-4 w-4 transition-colors duration-150 ${
            wished ? 'fill-spark text-spark' : ''
          }`}
        />
      </button>

      {interactive ? (
        <Link href={`/product/${product.slug}`}>{media}</Link>
      ) : (
        media
      )}

      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        {interactive ? (
          <Link href={`/product/${product.slug}`}>{title}</Link>
        ) : (
          title
        )}
        <p className="text-[13px] text-mute">
          {product.subtitle?.trim() || product.categoryLabel}
          {selectedColorway?.name ? (
            <span className="text-mute"> {selectedColorway.name}</span>
          ) : null}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="inline-flex max-w-full items-baseline gap-1">
                <span className="shrink-0 text-[15px] font-semibold text-ink">
                  {formatPrice(product.price)}
                </span>
                {product.compareAt ? (
                  <span className="text-[11px] leading-none text-mute line-through sm:text-[13px]">
                    {formatPrice(product.compareAt)}
                  </span>
                ) : null}
              </span>
              <DiscountChip
                price={product.price}
                compareAt={product.compareAt}
              />
            </div>
          </div>

          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            disabled={!interactive || !canAdd}
            onClick={() => onAddToCart?.()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-colors duration-150 ease-out hover:bg-navy-deep active:scale-[0.97] disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>

        {showSwatches ? (
          <ColorSwatchRow
            colorways={colorways}
            selectedKey={selectedColorKey}
            onSelect={(key) => onSelectColor?.(key)}
            interactive={interactive && Boolean(onSelectColor)}
          />
        ) : null}
      </div>
    </motion.article>
  )
}

function ColorSwatchRow({
  colorways,
  selectedKey,
  onSelect,
  interactive,
}: {
  colorways: ProductColorwayOption[]
  selectedKey: string | null
  onSelect: (key: string) => void
  interactive: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollMore, setCanScrollMore] = useState(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const update = () => {
      setCanScrollMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [colorways.length])

  return (
    <div className="relative mt-3">
      <div
        ref={scrollerRef}
        className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Color options"
      >
        {colorways.map((colorway, index) => {
          const selected = colorway.key === selectedKey
          return (
            <button
              key={colorway.key}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={
                colorway.name
                  ? `Color ${colorway.name}`
                  : `Color ${index + 1}`
              }
              title={colorway.name ?? undefined}
              disabled={!interactive}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onSelect(colorway.key)
              }}
              className={[
                'relative h-5 w-5 shrink-0 overflow-hidden rounded-[3px] border transition',
                selected
                  ? 'border-ink'
                  : 'border-black/10 hover:border-black/25',
                interactive ? 'cursor-pointer' : 'pointer-events-none',
              ].join(' ')}
            >
              <ColorSwatchFill colorway={colorway} />
            </button>
          )
        })}
      </div>

      {canScrollMore ? (
        <button
          type="button"
          aria-label="Show more colors"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            scrollerRef.current?.scrollBy({ left: 48, behavior: 'smooth' })
          }}
          className="absolute -right-1 top-0 flex h-5 w-5 items-center justify-center bg-gradient-to-l from-white via-white to-transparent text-mute"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Solid swatch: sample the colorway photo when available; else stored/named hex.
 */
function ColorSwatchFill({ colorway }: { colorway: ProductColorwayOption }) {
  const [sampledHex, setSampledHex] = useState<string | null>(null)

  useEffect(() => {
    if (!colorway.imageUrl) {
      setSampledHex(null)
      return
    }

    let cancelled = false
    void sampleDominantColorFromUrl(colorway.imageUrl).then((hex) => {
      if (!cancelled) setSampledHex(hex)
    })
    return () => {
      cancelled = true
    }
  }, [colorway.imageUrl])

  const fill = sampledHex ?? colorway.colorHex
  if (fill) {
    return (
      <span
        className="absolute inset-0"
        style={{ backgroundColor: fill }}
      />
    )
  }

  return (
    <span className="absolute inset-0 bg-mist" />
  )
}
