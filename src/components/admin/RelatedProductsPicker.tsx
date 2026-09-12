'use client'

import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import { formatPrice } from '@/lib/brand'
import { productBadgeClassName } from '@/lib/catalog/badge'
import type { RelatedPickerProduct } from '@/lib/catalog/queries'

type CategoryChip = {
  key: string
  label: string
  sort: number
}

/**
 * You May Also Like picker — shop-style chips + grid.
 * Selection only; parent Save product persists.
 */
export function RelatedProductsPicker({
  catalog,
  selectedIds,
  onChange,
}: {
  catalog: RelatedPickerProduct[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [category, setCategory] = useState('all')
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const chips = useMemo(() => {
    const byKey = new Map<string, CategoryChip>()
    for (const product of catalog) {
      const key = product.categoryId ?? 'uncategorized'
      if (byKey.has(key)) continue
      byKey.set(key, {
        key,
        label: product.categoryLabel,
        sort: product.categorySort,
      })
    }
    return [...byKey.values()].sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort
      return a.label.localeCompare(b.label)
    })
  }, [catalog])

  const filtered = useMemo(() => {
    if (category === 'all') return catalog
    return catalog.filter(
      (product) => (product.categoryId ?? 'uncategorized') === category,
    )
  }, [catalog, category])

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
      return
    }
    if (selectedIds.length >= RELATED_PRODUCTS_DISPLAY_CAP) return
    onChange([...selectedIds, id])
  }

  const atCap = selectedIds.length >= RELATED_PRODUCTS_DISPLAY_CAP

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-mute">
        Hover a card and check it to feature here. Selection order is the PDP
        order · {selectedIds.length}/{RELATED_PRODUCTS_DISPLAY_CAP} selected
      </p>

      {selectedIds.length > 0 ? (
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-mute">
            Selected
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {selectedIds.map((id, index) => {
              const product = catalog.find((p) => p.id === id)
              if (!product) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className="group relative w-24 shrink-0 text-left"
                  title="Click to remove"
                >
                  <span className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-navy text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-white text-navy shadow-sm">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div className="aspect-square overflow-hidden rounded-xl bg-white shadow-card">
                    <img
                      src={product.image}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-ink">
                    {product.name}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {catalog.length === 0 ? (
        <p className="text-[14px] text-mute">
          No other products yet. Create more styles to recommend.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto border-b border-cloud pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip
              label="All"
              active={category === 'all'}
              onClick={() => setCategory('all')}
            />
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                active={category === chip.key}
                onClick={() => setCategory(chip.key)}
              />
            ))}
          </div>

          <p className="text-[13px] text-mute">
            {filtered.length} of {catalog.length} styles
          </p>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[15px] text-mute">
                No products in this filter yet.
              </p>
              <button
                type="button"
                onClick={() => setCategory('all')}
                className="mt-4 text-[14px] font-semibold text-navy hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {filtered.map((product) => {
                const selected = selectedSet.has(product.id)
                const blocked = atCap && !selected
                return (
                  <RelatedMiniCard
                    key={product.id}
                    product={product}
                    selected={selected}
                    disabled={blocked}
                    onToggle={() => toggle(product.id)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition ${
        active
          ? 'bg-navy text-white'
          : 'bg-white text-ink ring-1 ring-cloud hover:ring-navy/30'
      }`}
    >
      {label}
    </button>
  )
}

function RelatedMiniCard({
  product,
  selected,
  disabled,
  onToggle,
}: {
  product: RelatedPickerProduct
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={selected}
      className={[
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card transition',
        selected ? 'ring-2 ring-navy' : 'hover:shadow-lift',
        disabled ? 'cursor-not-allowed opacity-45' : '',
      ].join(' ')}
    >
      <span
        className={[
          'absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition',
          selected
            ? 'border-navy bg-navy text-white opacity-100'
            : 'border-cloud bg-white/95 text-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
        ].join(' ')}
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>

      {!product.active ? (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          Draft
        </span>
      ) : (
        <span
          className={`absolute left-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${productBadgeClassName(product.badge)}`}
        >
          {product.badge}
        </span>
      )}

      <div className="aspect-square overflow-hidden bg-mist/30">
        <img
          src={product.image}
          alt=""
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-2.5 pb-2.5 pt-2">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink">
          {product.name}
        </p>
        <div className="mt-auto flex items-baseline gap-1.5 pt-1">
          <span className="text-[12px] font-semibold text-ink">
            {formatPrice(product.price)}
          </span>
          {product.compareAt ? (
            <span className="text-[10px] text-mute line-through">
              {formatPrice(product.compareAt)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}
