'use client'

import Link from 'next/link'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Product } from '@/lib/catalog/types'
import { productBadgeClassName } from '@/lib/catalog/badge'
import { formatPrice } from '@/lib/brand'
import { enterTransition, springHover } from '@/lib/motion'
import { useCart } from '@/context/CartContext'
import { trackAddToCart } from '@/lib/analytics/events'

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
  const defaultSize =
    product.sizes[Math.floor(product.sizes.length / 2)] ?? product.sizes[0]
  const defaultVariant =
    product.variants.find((v) => v.sizeEu === defaultSize && v.stock > 0) ??
    product.variants.find((v) => v.stock > 0) ??
    product.variants[0]

  return (
    <ProductCardView
      product={product}
      index={index}
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
          item_variant: `EU ${defaultVariant.sizeEu}`,
        })
      }}
    />
  )
}

function ProductCardView({
  product,
  index,
  wished = false,
  canAdd = true,
  onToggleWishlist,
  onAddToCart,
}: {
  product: Product
  index: number
  wished?: boolean
  canAdd?: boolean
  onToggleWishlist?: () => void
  onAddToCart?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const interactive = Boolean(onToggleWishlist && onAddToCart)

  const media = (
    <div className="block aspect-square overflow-hidden">
      <img
        src={product.image}
        alt={product.name}
        className={[
          'h-full w-full object-contain will-change-transform',
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
        <p className="text-[13px] text-mute">{product.categoryLabel}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-ink">
                {formatPrice(product.price)}
              </span>
              {product.compareAt && (
                <span className="text-[13px] text-mute line-through">
                  {formatPrice(product.compareAt)}
                </span>
              )}
            </div>
            {product.reviews > 0 ? (
              <div className="mt-1 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                <span className="text-[12px] font-medium text-ink">
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-[12px] text-mute">({product.reviews})</span>
              </div>
            ) : null}
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
      </div>
    </motion.article>
  )
}
