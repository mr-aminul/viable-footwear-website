'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  Archive,
  ChevronRight,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Trash2,
} from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import {
  archiveProducts,
  deleteProducts,
  setProductsActive,
} from '@/lib/catalog/actions/products'
import type { AdminProductView } from '@/lib/catalog/queries'
import { AdminProductCard } from '@/components/admin/AdminProductCard'
import { ProductConfirmDialog } from '@/components/admin/ProductConfirmDialog'
import { adminButtonClassName } from '@/components/admin/ui'

type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'admin-products-view'

type BulkFailure = {
  productId: string
  productName: string | null
  error: string
}

type AdminProductsBrowserProps = {
  products: AdminProductView[]
  total: number
}

export function AdminProductsBrowser({
  products,
  total,
}: AdminProductsBrowserProps) {
  const [view, setView] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkSummary, setBulkSummary] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'grid' || stored === 'list') setView(stored)
    } catch {
      /* ignore */
    }
  }, [])

  // Drop selections for products no longer on this page after refresh.
  useEffect(() => {
    const visible = new Set(products.map((product) => product.id))
    setSelected((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (visible.has(id)) next.add(id)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [products])

  const setViewMode = (next: ViewMode) => {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const productsById = useMemo(() => {
    const map = new Map<string, AdminProductView>()
    for (const product of products) map.set(product.id, product)
    return map
  }, [products])

  const selectedProducts = useMemo(
    () =>
      [...selected]
        .map((id) => productsById.get(id))
        .filter((product): product is AdminProductView => Boolean(product)),
    [selected, productsById],
  )

  const selectedLive = useMemo(
    () => selectedProducts.filter((product) => product.active).map((p) => p.id),
    [selectedProducts],
  )
  const selectedDraft = useMemo(
    () =>
      selectedProducts.filter((product) => !product.active).map((p) => p.id),
    [selectedProducts],
  )

  const allSelected =
    products.length > 0 && products.every((product) => selected.has(product.id))
  const someSelected =
    !allSelected && products.some((product) => selected.has(product.id))

  const canConfirmDelete = confirmText.trim() === 'delete'
  const selectionCount = selectedProducts.length
  const showToolbar = selectionCount > 0

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setBulkError(null)
    setBulkSummary(null)
  }

  const toggleAll = (checked: boolean) => {
    setSelected(
      checked ? new Set(products.map((product) => product.id)) : new Set(),
    )
    setBulkError(null)
    setBulkSummary(null)
  }

  const clearSelection = () => {
    setSelected(new Set())
    setBulkError(null)
    setBulkSummary(null)
  }

  const openDeleteDialog = () => {
    setBulkError(null)
    setBulkSummary(null)
    setConfirmText('')
    setDeleteOpen(true)
  }

  const closeDeleteDialog = () => {
    if (pending) return
    setDeleteOpen(false)
    setConfirmText('')
  }

  const applyBulkResult = (
    ids: string[],
    result:
      | {
          ok: true
          data?: {
            okCount: number
            failCount: number
            failures: BulkFailure[]
          }
        }
      | { ok: false; error: string },
    successLabel: (okCount: number) => string,
  ) => {
    if (!result.ok || !result.data) {
      setBulkError(result.ok ? 'Unexpected response.' : result.error)
      return
    }
    const { okCount, failCount, failures } = result.data
    if (failCount === 0) {
      setBulkSummary(successLabel(okCount))
      setSelected(new Set())
      setDeleteOpen(false)
      setConfirmText('')
      return
    }
    const detail = failures
      .slice(0, 3)
      .map((f) => `${f.productName ?? f.productId}: ${f.error}`)
      .join(' · ')
    const more = failures.length > 3 ? ` (+${failures.length - 3} more)` : ''
    setBulkError(`${okCount} succeeded, ${failCount} failed. ${detail}${more}`)
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (!failures.some((f) => f.productId === id)) next.delete(id)
      }
      return next
    })
    setDeleteOpen(false)
    setConfirmText('')
  }

  const runMakeLive = () => {
    if (selectedDraft.length === 0) return
    const ids = [...selectedDraft]
    setBulkError(null)
    setBulkSummary(null)
    startTransition(async () => {
      const result = await setProductsActive(ids, true)
      applyBulkResult(ids, result, (okCount) =>
        okCount === 1
          ? '1 product is now live.'
          : `${okCount} products are now live.`,
      )
    })
  }

  const runArchive = () => {
    if (selectedLive.length === 0) return
    const ids = [...selectedLive]
    setBulkError(null)
    setBulkSummary(null)
    startTransition(async () => {
      const result = await archiveProducts(ids)
      applyBulkResult(ids, result, (okCount) =>
        okCount === 1
          ? '1 product archived.'
          : `${okCount} products archived.`,
      )
    })
  }

  const runDelete = () => {
    if (selectionCount === 0 || !canConfirmDelete) return
    const ids = selectedProducts.map((product) => product.id)
    startTransition(async () => {
      const result = await deleteProducts(ids)
      applyBulkResult(ids, result, (okCount) =>
        okCount === 1
          ? '1 product deleted.'
          : `${okCount} products deleted.`,
      )
    })
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

      {showToolbar ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-cloud bg-white px-4 py-3 sm:gap-3">
          <p className="mr-1 text-[13px] font-medium text-ink">
            {selectionCount} selected
          </p>
          {selectedDraft.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={runMakeLive}
              className={adminButtonClassName('primary')}
            >
              {pending && !deleteOpen ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Make live ({selectedDraft.length})
            </button>
          ) : null}
          {selectedLive.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={runArchive}
              className={adminButtonClassName('secondary')}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive ({selectedLive.length})
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={openDeleteDialog}
            className={adminButtonClassName('danger')}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {selectionCount}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={clearSelection}
            className={adminButtonClassName('ghost')}
          >
            Clear
          </button>
        </div>
      ) : null}

      {bulkError ? (
        <p className="mt-3 rounded-xl border border-spark/30 bg-spark/10 px-4 py-3 text-[13px] text-spark">
          {bulkError}
        </p>
      ) : null}
      {bulkSummary ? (
        <p className="mt-3 rounded-xl border border-navy/20 bg-navy/5 px-4 py-3 text-[13px] text-navy">
          {bulkSummary}
        </p>
      ) : null}

      {view === 'grid' ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product, i) => (
            <AdminProductCard
              key={product.id}
              product={product}
              index={i}
              selected={selected.has(product.id)}
              selectionDisabled={pending}
              onSelectedChange={(checked) => toggleOne(product.id, checked)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-cloud bg-white">
          <div className="hidden border-b border-cloud bg-mist/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_7rem_5.5rem_1.25rem] md:gap-4">
            <span className="flex items-center justify-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-cloud accent-navy"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                disabled={products.length === 0 || pending}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all products"
              />
            </span>
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span className="sr-only">Open</span>
          </div>
          <div className="flex items-center gap-3 border-b border-cloud px-3 py-2.5 md:hidden">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-cloud accent-navy"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              disabled={products.length === 0 || pending}
              onChange={(e) => toggleAll(e.target.checked)}
              aria-label="Select all products"
            />
            <span className="text-[12px] font-medium text-mute">
              Select all on this page
            </span>
          </div>
          <ul className="divide-y divide-cloud">
            {products.map((product) => {
              const isSelected = selected.has(product.id)
              return (
                <li
                  key={product.id}
                  className={isSelected ? 'bg-navy/[0.03]' : undefined}
                >
                  <div className="flex items-center gap-2 px-3 py-3 md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_7rem_5.5rem_1.25rem] md:gap-4 md:px-4">
                    <div className="flex shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-cloud accent-navy disabled:opacity-40"
                        checked={isSelected}
                        disabled={pending}
                        onChange={(e) =>
                          toggleOne(product.id, e.target.checked)
                        }
                        aria-label={`Select ${product.name}`}
                      />
                    </div>
                    <Link
                      href={`/admin/catalog/products/${product.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-90 md:contents"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3 md:min-w-0">
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

                      <span className="hidden shrink-0 md:inline-flex">
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

                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-mute md:ml-0 md:block" />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {deleteOpen && selectionCount > 0 ? (
        <ProductConfirmDialog
          count={selectionCount}
          isSubmitting={pending}
          confirmText={confirmText}
          onConfirmTextChange={setConfirmText}
          canConfirm={canConfirmDelete}
          onDismiss={closeDeleteDialog}
          onConfirm={runDelete}
        />
      ) : null}
    </>
  )
}
