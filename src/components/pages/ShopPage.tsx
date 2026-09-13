'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CategoryView, Product } from '@/lib/catalog/types'
import { ProductCard } from '@/components/ProductCard'

export function ShopPage({
  products,
  categories,
}: {
  products: Product[]
  categories: CategoryView[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const category = params.get('category') ?? 'all'
  const saleOnly = params.get('sale') === '1'
  const [sort, setSort] = useState('featured')

  const filtered = useMemo(() => {
    let list =
      category === 'all'
        ? products
        : products.filter((p) => p.category === category)
    if (saleOnly) list = list.filter((p) => p.badge === 'Sale' || p.compareAt)
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating)
    if (sort === 'featured') {
      list = [...list].sort(
        (a, b) => Number(b.featured) - Number(a.featured),
      )
    }
    return list
  }, [category, saleOnly, sort, products])

  const setParams = (next: URLSearchParams | Record<string, string>) => {
    const qs =
      next instanceof URLSearchParams
        ? next.toString()
        : new URLSearchParams(next).toString()
    router.push(qs ? `/shop?${qs}` : '/shop')
  }

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params.toString())
    next.delete('sale')
    if (id === 'all') next.delete('category')
    else next.set('category', id)
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
          {saleOnly ? 'Sale' : 'Shop'}
        </h1>
        <p className="mt-2 text-[15px] text-mute">
          {saleOnly
            ? 'Limited deals on foam, crocs & kicks.'
            : 'Casual footwear for every Dhaka day.'}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-b border-cloud pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip
            active={category === 'all' && !saleOnly}
            onClick={() => {
              setParams({})
            }}
            label="All"
          />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              active={category === c.slug}
              onClick={() => setCategory(c.slug)}
              label={c.name}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-mute">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-cloud bg-white px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-navy"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low–High</option>
            <option value="price-desc">Price: High–Low</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>

      <p className="mt-6 text-[13px] text-mute">
        {filtered.length} of {products.length} styles
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {filtered.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-cloud bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-ink">No styles match</p>
          <p className="mt-2 text-[14px] text-mute">
            Try another category or clear filters.
          </p>
          <button
            type="button"
            onClick={() => setParams({})}
            className="mt-6 text-[14px] font-semibold text-navy hover:underline"
          >
            Clear filters
          </button>
        </div>
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
