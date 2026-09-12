'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutGrid, List, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import type { AdminProductView } from '@/lib/catalog/queries'
import { AdminProductCard } from '@/components/admin/AdminProductCard'

type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'admin-products-view'

type AdminProductsBrowserProps = {
  products: AdminProductView[]
  total: number
}

export function AdminProductsBrowser({
  products,
  total,
}: AdminProductsBrowserProps) {
  const [view, setView] = useState<ViewMode>('list')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'grid' || stored === 'list') setView(stored)
    } catch {
      /* ignore */
    }
  }, [])

  const setViewMode = (next: ViewMode) => {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-mute">
          {total} style{total === 1 ? '' : 's'}
        </p>
        <div
          className="inline-flex rounded-full border border-cloud bg-white p-0.5"
          role="group"
          aria-label="Product layout"
        >
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={view === 'list'}
            title="List view"
            className={[
              'inline-flex h-8 w-8 items-center justify-center rounded-full transition',
              view === 'list'
                ? 'bg-navy text-white'
                : 'text-mute hover:text-ink',
            ].join(' ')}
          >
            <List className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={view === 'grid'}
            title="Grid view"
            className={[
              'inline-flex h-8 w-8 items-center justify-center rounded-full transition',
              view === 'grid'
                ? 'bg-navy text-white'
                : 'text-mute hover:text-ink',
            ].join(' ')}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product, i) => (
            <AdminProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-cloud bg-white">
          <div className="hidden border-b border-cloud bg-mist/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute md:grid md:grid-cols-[minmax(0,1fr)_8rem_7rem_5.5rem_1.25rem] md:gap-4">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span className="sr-only">Open</span>
          </div>
          <ul className="divide-y divide-cloud">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/catalog/products/${product.id}`}
                  className="flex items-center gap-3 px-3 py-3 transition hover:bg-mist/60 md:grid md:grid-cols-[minmax(0,1fr)_8rem_7rem_5.5rem_1.25rem] md:gap-4 md:px-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-mist">
                      <img
                        src={product.image}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink">
                        {product.name}
                      </p>
                      <p className="truncate text-[12px] text-mute md:hidden">
                        {product.categoryLabel || 'Uncategorized'} ·{' '}
                        {formatPrice(product.price)}
                      </p>
                      <p className="hidden truncate text-[12px] text-mute md:block">
                        /{product.slug}
                      </p>
                    </div>
                  </div>

                  <span className="hidden truncate text-[13px] text-mute md:block">
                    {product.categoryLabel || '—'}
                  </span>

                  <span className="hidden text-[13px] font-medium text-ink md:block">
                    {formatPrice(product.price)}
                  </span>

                  <span className="shrink-0">
                    {product.active ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-mute">
                        Draft
                      </span>
                    )}
                  </span>

                  <ChevronRight className="hidden h-4 w-4 text-mute md:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
