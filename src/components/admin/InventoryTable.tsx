'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, Minus, Plus } from 'lucide-react'
import { updateVariantStock } from '@/lib/catalog/actions/products'
import { adminProductPath } from '@/lib/admin/paths'
import type { AdminInventoryRow } from '@/lib/catalog/types'

const LOW_STOCK_THRESHOLD = 5

function parseStock(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

function StockLevelPill({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex rounded-full bg-spark/10 px-2.5 py-1 text-[11px] font-semibold text-spark">
        Out of stock
      </span>
    )
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
        Low
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
      In stock
    </span>
  )
}

function StockStepper({
  value,
  disabled,
  onChange,
  onCommit,
}: {
  value: string
  disabled?: boolean
  onChange: (stock: string) => void
  onCommit: (stock: string) => void
}) {
  const stock = parseStock(value)
  const canDecrease = stock > 0 && !disabled

  return (
    <div className="inline-flex w-[5.5rem] items-center rounded-lg border border-cloud bg-white focus-within:border-navy">
      <button
        type="button"
        aria-label="Decrease stock"
        disabled={!canDecrease}
        onClick={() => onCommit(String(stock - 1))}
        className="flex h-8 w-6 shrink-0 items-center justify-center text-ink transition hover:bg-mist/60 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const normalized = String(parseStock(value))
          if (value !== normalized) onChange(normalized)
          onCommit(normalized)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        aria-label="Stock"
        className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1.5 text-center text-[13px] text-ink outline-none disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase stock"
        disabled={disabled}
        onClick={() => onCommit(String(stock + 1))}
        className="flex h-8 w-6 shrink-0 items-center justify-center text-ink transition hover:bg-mist/60 disabled:opacity-35"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

type RowState = {
  draft: string
  saved: number
  saving: boolean
  error: string | null
}

function InventoryRow({ row }: { row: AdminInventoryRow }) {
  const [state, setState] = useState<RowState>({
    draft: String(row.stock),
    saved: row.stock,
    saving: false,
    error: null,
  })
  const [, startTransition] = useTransition()

  useEffect(() => {
    setState({
      draft: String(row.stock),
      saved: row.stock,
      saving: false,
      error: null,
    })
  }, [row.variantId, row.stock])

  const handleCommit = (nextRaw: string) => {
    const next = parseStock(nextRaw)
    if (next === state.saved && !state.error) {
      setState((prev) => ({ ...prev, draft: String(next) }))
      return
    }

    setState((prev) => ({
      ...prev,
      draft: String(next),
      saving: true,
      error: null,
    }))

    startTransition(async () => {
      const result = await updateVariantStock(row.variantId, next)
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          saving: false,
          draft: String(prev.saved),
          error: result.error,
        }))
        return
      }
      setState({
        draft: String(next),
        saved: next,
        saving: false,
        error: null,
      })
    })
  }

  const dirty = parseStock(state.draft) !== state.saved

  return (
    <tr className="border-b border-cloud last:border-0">
      <td className="px-3 py-3">
        <div className="min-w-0">
          <Link
            href={adminProductPath(row.productSlug)}
            className="font-semibold text-ink transition hover:text-navy"
          >
            {row.productName}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-mute">
            <span
              className={
                row.productActive
                  ? 'font-semibold text-navy'
                  : 'font-semibold text-mute'
              }
            >
              {row.productActive ? 'Live' : 'Draft'}
            </span>
            {!row.variantActive ? (
              <span className="font-semibold text-spark">Variant off</span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 tabular-nums text-ink">{row.sizeEu}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {row.colorHex ? (
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-cloud"
              style={{ backgroundColor: row.colorHex }}
              aria-hidden
            />
          ) : null}
          <span className="text-ink">{row.color || '—'}</span>
        </div>
      </td>
      <td className="px-3 py-3 font-mono text-[12px] text-mute">
        {row.sku || '—'}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <StockStepper
            value={state.draft}
            disabled={state.saving}
            onChange={(stock) => {
              setState((prev) => ({ ...prev, draft: stock, error: null }))
            }}
            onCommit={handleCommit}
          />
          {state.saving ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-mute"
              aria-label="Saving"
            />
          ) : dirty ? (
            <button
              type="button"
              onClick={() => handleCommit(state.draft)}
              className="text-[11px] font-semibold text-navy hover:underline"
            >
              Save
            </button>
          ) : null}
        </div>
        {state.error ? (
          <p className="mt-1 text-[11px] text-spark">{state.error}</p>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <StockLevelPill stock={state.saved} />
      </td>
      <td className="px-3 py-3">
        <Link
          href={adminProductPath(row.productSlug)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mute transition hover:bg-mist hover:text-navy"
          aria-label={`Edit ${row.productName}`}
          title="Edit product"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  )
}

export function InventoryTable({ rows }: { rows: AdminInventoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cloud bg-white px-6 py-16 text-center">
        <p className="text-[15px] font-semibold text-ink">No variants found</p>
        <p className="mx-auto mt-2 max-w-md text-[14px] text-mute">
          Try a different search, or clear stock filters. Variants appear here
          once products have sizes and colors.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
      <table className="w-full min-w-[920px] text-left text-[13px]">
        <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
          <tr>
            <th className="px-3 py-3">Product</th>
            <th className="px-3 py-3">Size</th>
            <th className="px-3 py-3">Color</th>
            <th className="px-3 py-3">SKU</th>
            <th className="px-3 py-3">Stock</th>
            <th className="px-3 py-3">Level</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <InventoryRow key={row.variantId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
