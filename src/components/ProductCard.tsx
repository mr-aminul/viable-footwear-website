import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Product } from '../data/products'
import { formatPrice } from '../data/products'
import { useCart } from '../context/CartContext'

interface ProductCardProps {
  product: Product
  index?: number
}

/**
 * Merchandised product tile with wishlist + quick-add.
 */
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useCart()
  const wished = isWishlisted(product.id)
  const defaultSize =
    product.sizes[Math.floor(product.sizes.length / 2)] ?? product.sizes[0]

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -8,
        transition: { type: 'spring', stiffness: 280, damping: 26, mass: 0.65 },
      }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.4,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-card transition-shadow duration-500 ease-out hover:shadow-lift"
    >
      {product.badge && (
        <span
          className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ${
            product.badge === 'Sale'
              ? 'bg-spark'
              : product.badge === 'New'
                ? 'bg-navy'
                : 'bg-ink/85'
          }`}
        >
          {product.badge}
        </span>
      )}

      <button
        type="button"
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={(e) => {
          e.preventDefault()
          toggleWishlist(product.id)
        }}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-colors duration-150 ease-out hover:bg-white"
      >
        <Heart
          className={`h-4 w-4 transition-colors duration-150 ${
            wished ? 'fill-spark text-spark' : ''
          }`}
        />
      </button>

      <Link to={`/product/${product.slug}`} className="block aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.06]"
          loading="lazy"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        <Link to={`/product/${product.slug}`}>
          <h3 className="text-[15px] font-semibold leading-snug text-ink transition-colors duration-150 group-hover:text-navy">
            {product.name}
          </h3>
        </Link>
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
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="text-[12px] font-medium text-ink">
                {product.rating.toFixed(1)}
              </span>
              <span className="text-[12px] text-mute">({product.reviews})</span>
            </div>
          </div>

          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={() => addToCart(product, defaultSize)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-colors duration-150 ease-out hover:bg-navy-deep active:scale-[0.97]"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  )
}
