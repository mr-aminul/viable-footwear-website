'use client'

import { useMemo, useState } from 'react'
import { formatPrice } from '@/lib/brand'
import type { RelatedPickerProduct } from '@/lib/catalog/queries'
import { softFieldClassName } from '@/components/admin/ui'

/**
 * Table multi-select for promo applicability — mirrors the products list feel.
 */
export function PromoProductPicker({
  catalog,
  selectedIds,
  onChange,
  disabled,
}: {
  catalog: RelatedPickerProduct[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q),
    )
  }, [catalog, query])

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedSet.has(p.id))
  const someFilteredSelected =
    !allFilteredSelected && filtered.some((p) => selectedSet.has(p.id))

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id))
      return
    }
    onChange([...selectedIds, id])
  }

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const remove = new Set(filtered.map((p) => p.id))
      onChange(selectedIds.filter((id) => !remove.has(id)))
      return
    }
    const next = new Set(selectedIds)
    for (const p of filtered) next.add(p.id)
    onChange([...next])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-mute">
          {selectedIds.length} product{selectedIds.length === 1 ? '' : 's'}{' '}
          selected
        </p>
        <input
          className={`${softFieldClassName} max-w-xs`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          disabled={disabled}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected
                  }}
                  onChange={toggleAllFiltered}
                  disabled={disabled || filtered.length === 0}
                  aria-label="Select all visible products"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-mute">
                  {catalog.length === 0
                    ? 'No products yet. Create products first.'
                    : 'No products match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const checked = selectedSet.has(product.id)
                return (
                  <tr
                    key={product.id}
                    className="border-b border-cloud last:border-0"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(product.id)}
                        disabled={disabled}
                        aria-label={`Select ${product.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-mist/40">
                          <img
                            src={product.image}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <span className="font-semibold text-ink">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-mute">
                      {product.categoryLabel}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          product.active
                            ? 'text-navy'
                            : 'text-mute'
                        }
                      >
                        {product.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
