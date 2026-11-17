'use client'

import { useMemo, useState } from 'react'
import { Check, Minus, Plus, Search, Trash2, X } from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import type { OrderImportPickerProduct } from '@/lib/catalog/queries'
import {
  summarizePickerLines,
  type OrderPickerSelectedLine,
} from '@/lib/orders/picker-lines'
import { SafeImage } from '@/components/SafeImage'

function lineKey(variantId: string) {
  return `v-${variantId}`
}

export function OrderItemPicker({
  catalog,
  value,
  onChange,
  compact,
}: {
  catalog: OrderImportPickerProduct[]
  value: OrderPickerSelectedLine[]
  onChange: (lines: OrderPickerSelectedLine[]) => void
  /** Tighter layout for spreadsheet modal. */
  compact?: boolean
}) {
  const [query, setQuery] = useState('')
  const [activeProductId, setActiveProductId] = useState<string | null>(
    catalog[0]?.id ?? null,
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q) ||
        product.variants.some(
          (variant) =>
            variant.color.toLowerCase().includes(q) ||
            variant.sku?.toLowerCase().includes(q),
        ),
    )
  }, [catalog, query])

  const activeProduct =
    filtered.find((product) => product.id === activeProductId) ??
    filtered[0] ??
    null

  const selectedByVariant = useMemo(() => {
    const map = new Map<string, OrderPickerSelectedLine>()
    for (const line of value) map.set(line.variantId, line)
    return map
  }, [value])

  const setQuantity = (
    product: OrderImportPickerProduct,
    variantId: string,
    quantity: number,
  ) => {
    const variant = product.variants.find((item) => item.id === variantId)
    if (!variant) return

    const nextQty = Math.max(0, Math.floor(quantity))
    const without = value.filter((line) => line.variantId !== variantId)
    if (nextQty <= 0) {
      onChange(without)
      return
    }

    onChange([
      ...without,
      {
        key: lineKey(variantId),
        productId: product.id,
        productName: product.name,
        image: product.image,
        variantId: variant.id,
        sizeEu: variant.sizeEu,
        color: variant.color,
        sku: variant.sku,
        quantity: nextQty,
        unitPrice: variant.unitPrice,
      },
    ])
  }

  const removeLine = (variantId: string) => {
    onChange(value.filter((line) => line.variantId !== variantId))
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product, color, or SKU…"
          className="h-9 w-full rounded-lg border border-cloud bg-white py-2 pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-mute focus:border-navy"
        />
      </div>

      <div className="grid min-h-0 gap-3 md:grid-cols-2">
        <div className="max-h-[min(22rem,45vh)] overflow-y-auto rounded-xl border border-cloud md:max-h-[min(28rem,55vh)]">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-mute">
              No products match.
            </p>
          ) : (
            filtered.map((product) => {
              const selectedCount = product.variants.filter((variant) =>
                selectedByVariant.has(variant.id),
              ).length
              const isActive = activeProduct?.id === product.id
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setActiveProductId(product.id)}
                  className={[
                    'flex w-full items-center gap-2.5 border-b border-cloud px-2.5 py-2 text-left last:border-0',
                    isActive ? 'bg-navy/[0.06]' : 'hover:bg-mist/70',
                  ].join(' ')}
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-mist">
                    <SafeImage
                      src={product.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-mute">
                      {formatPrice(product.price)} · {product.variants.length}{' '}
                      variants
                    </p>
                  </div>
                  {selectedCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-semibold text-white">
                      {selectedCount}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        <div className="rounded-xl border border-cloud bg-white p-3">
          {!activeProduct ? (
            <p className="py-10 text-center text-[13px] text-mute">
              Pick a product to choose sizes & colors.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-mist">
                  <SafeImage
                    src={activeProduct.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {activeProduct.name}
                  </p>
                  <p className="text-[12px] text-mute">
                    Tap variants to add · set quantity
                  </p>
                </div>
              </div>

              <div className="max-h-[min(18rem,40vh)] space-y-1.5 overflow-y-auto md:max-h-[min(22rem,48vh)]">
                {activeProduct.variants.map((variant) => {
                  const selected = selectedByVariant.get(variant.id)
                  const qty = selected?.quantity ?? 0
                  const out = variant.stock <= 0
                  return (
                    <div
                      key={variant.id}
                      className={[
                        'flex items-center gap-2 rounded-lg border px-2.5 py-2',
                        qty > 0
                          ? 'border-navy/30 bg-navy/[0.04]'
                          : 'border-cloud',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        disabled={out}
                        onClick={() =>
                          setQuantity(
                            activeProduct,
                            variant.id,
                            qty > 0 ? 0 : 1,
                          )
                        }
                        className={[
                          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
                          qty > 0
                            ? 'border-navy bg-navy text-white'
                            : 'border-cloud bg-white text-mute',
                          out ? 'opacity-40' : '',
                        ].join(' ')}
                        aria-label={
                          qty > 0
                            ? `Remove ${variant.color} EU ${variant.sizeEu}`
                            : `Add ${variant.color} EU ${variant.sizeEu}`
                        }
                      >
                        {qty > 0 ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">
                          EU {variant.sizeEu} · {variant.color}
                        </p>
                        <p className="text-[11px] text-mute">
                          {formatPrice(variant.unitPrice)}
                          {out
                            ? ' · Out of stock'
                            : ` · ${variant.stock} in stock`}
                        </p>
                      </div>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-cloud"
                            onClick={() =>
                              setQuantity(
                                activeProduct,
                                variant.id,
                                qty - 1,
                              )
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            value={qty}
                            onChange={(event) => {
                              const next = Number(event.target.value)
                              if (!Number.isFinite(next)) return
                              setQuantity(activeProduct, variant.id, next)
                            }}
                            className="h-7 w-10 rounded-md border border-cloud text-center text-[12px] outline-none focus:border-navy"
                            inputMode="numeric"
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-cloud"
                            onClick={() =>
                              setQuantity(
                                activeProduct,
                                variant.id,
                                qty + 1,
                              )
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-cloud bg-mist/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-ink">
            Selected · {summarizePickerLines(value) || 'none'}
          </p>
          {value.length > 0 ? (
            <button
              type="button"
              className="text-[12px] font-semibold text-spark hover:underline"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          ) : null}
        </div>
        {value.length === 0 ? (
          <p className="text-[12px] text-mute">
            Choose one or more size/color variants from the list.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {value.map((line) => (
              <li
                key={line.key}
                className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5"
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-mist">
                  <SafeImage
                    src={line.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-ink">
                    {line.productName}
                  </p>
                  <p className="text-[11px] text-mute">
                    EU {line.sizeEu} · {line.color} ×{line.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-mute hover:bg-mist hover:text-spark"
                  onClick={() => removeLine(line.variantId)}
                  aria-label={`Remove ${line.productName}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function OrderItemPickerModal({
  open,
  catalog,
  value,
  onChange,
  onClose,
  onDone,
}: {
  open: boolean
  catalog: OrderImportPickerProduct[]
  value: OrderPickerSelectedLine[]
  onChange: (lines: OrderPickerSelectedLine[]) => void
  onClose: () => void
  onDone: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-3 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-[91] max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-extrabold text-ink">
            Add products
          </h3>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-white hover:text-ink"
            onClick={onClose}
            aria-label="Close picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <OrderItemPicker
          catalog={catalog}
          value={value}
          onChange={onChange}
          compact
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-lg border border-cloud bg-white px-3 text-[12px] font-semibold text-ink"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-lg bg-navy px-3 text-[12px] font-semibold text-white hover:bg-navy-deep"
            onClick={onDone}
          >
            Done · {value.length} selected
          </button>
        </div>
      </div>
    </div>
  )
}
