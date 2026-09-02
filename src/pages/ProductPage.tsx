import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Heart, Star, Truck } from 'lucide-react'
import {
  formatPrice,
  getProductBySlug,
  products,
} from '../data/products'
import { useCart } from '../context/CartContext'
import { ProductCard } from '../components/ProductCard'

export function ProductPage() {
  const { slug } = useParams()
  const product = getProductBySlug(slug ?? '')
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [size, setSize] = useState<number | null>(null)
  const [color, setColor] = useState(0)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-extrabold">Product not found</h1>
        <Link to="/shop" className="mt-4 inline-block text-navy underline">
          Back to shop
        </Link>
      </div>
    )
  }

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)
  const wished = isWishlisted(product.id)

  const handleAdd = () => {
    if (size == null) {
      setError('Select a size')
      return
    }
    setError('')
    addToCart(product, size)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <Link
        to="/shop"
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
          className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-white"
        >
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain"
          />
          {product.badge && (
            <span
              className={`absolute left-4 top-4 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white ${
                product.badge === 'Sale' ? 'bg-spark' : 'bg-navy'
              }`}
            >
              {product.badge}
            </span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <p className="text-[13px] font-medium text-mute">{product.categoryLabel}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            {product.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="text-[14px] font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-[14px] text-mute">({product.reviews} reviews)</span>
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

          <div className="mt-8">
            <p className="text-[13px] font-semibold text-ink">Color</p>
            <div className="mt-3 flex gap-2.5">
              {product.colors.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${i + 1}`}
                  onClick={() => setColor(i)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    color === i ? 'border-navy scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                />
              ))}
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Size (EU)</p>
              <Link to="/about" className="text-[12px] font-medium text-navy underline-offset-2 hover:underline">
                Size guide
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
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
                className={`h-[18px] w-[18px] ${wished ? 'fill-spark text-spark' : ''}`}
              />
            </button>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-mist/80 px-4 py-4">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
            <p className="text-[13px] leading-relaxed text-mute">
              Free delivery in Dhaka on orders over ৳3,000. Usually ships within
              24–48 hours. WhatsApp us for same-day options.
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
