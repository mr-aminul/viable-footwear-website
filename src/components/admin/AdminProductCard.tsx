'use client'

import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/brand'
import { adminProductPath } from '@/lib/admin/paths'
import { productBadgeClassName } from '@/lib/catalog/badge'
import type { AdminProductView } from '@/lib/catalog/queries'

type AdminProductCardProps = {
  product: AdminProductView
  index?: number
  selected?: boolean
  selectionDisabled?: boolean
  onSelectedChange?: (checked: boolean) => void
}

/**
 * Storefront-matching product tile for the admin Products grid.
 * Links into the visual editor instead of the public PDP.
 */
export function AdminProductCard({
  product,
  index = 0,
  selected = false,
  selectionDisabled = false,
  onSelectedChange,
}: AdminProductCardProps) {
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
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-card transition-shadow duration-500 ease-out hover:shadow-lift',
        selected ? 'ring-2 ring-navy/40' : '',
      ].join(' ')}
    >
      <Link
        href={adminProductPath(product.slug)}
        className="absolute inset-0 z-20"
        aria-label={`Edit ${product.name}`}
      />

      {onSelectedChange ? (
        <label
          className="absolute left-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cloud accent-navy disabled:opacity-40"
            checked={selected}
            disabled={selectionDisabled}
            onChange={(e) => onSelectedChange(e.target.checked)}
            aria-label={`Select ${product.name}`}
          />
        </label>
      ) : null}

      {!product.active ? (
        <span
          className={[
            'absolute top-3 z-10 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white',
            onSelectedChange ? 'left-14' : 'left-3',
          ].join(' ')}
        >
          Draft
        </span>
      ) : (
        <span
          className={[
            'absolute top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
            productBadgeClassName(product.badge),
            onSelectedChange ? 'left-14' : 'left-3',
          ].join(' ')}
        >
          {product.badge}
        </span>
      )}

      <span className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm">
        <Heart className="h-4 w-4" />
      </span>

      <div className="aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.06]"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        <h3 className="text-[15px] font-semibold leading-snug text-ink transition-colors duration-150 group-hover:text-navy">
          {product.name}
        </h3>
        <p className="text-[13px] text-mute">{product.categoryLabel}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-ink">
                {formatPrice(product.price)}
              </span>
              {product.compareAt ? (
                <span className="text-[13px] text-mute line-through">
                  {formatPrice(product.compareAt)}
                </span>
              ) : null}
            </div>
          </div>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
            <ShoppingBag className="h-4 w-4" />
          </span>
        </div>
      </div>
    </motion.article>
  )
}
