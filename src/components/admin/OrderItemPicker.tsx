'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { formatPrice } from '@/lib/brand'
import { colorwayKey } from '@/lib/catalog/colorway'
import {
  formatSizeLabel,
  isOneSizeEu,
} from '@/lib/catalog/sizing'
import type { OrderImportPickerProduct } from '@/lib/catalog/queries'
import {
  summarizePickerLines,
  type OrderPickerSelectedLine,
} from '@/lib/orders/picker-lines'
import { SafeImage } from '@/components/SafeImage'
import { SizeOptionButton } from '@/components/SizeOptionButton'

type SizeUnit = 'EU' | 'UK'

type PickerColorway = {
  key: string
  name: string
  imageUrl: string | null
  colorHex: string | null
}

function lineKey(variantId: string) {
  return `v-${variantId}`
}

function colorwaysForProduct(
  product: OrderImportPickerProduct,
): PickerColorway[] {
  const unique = new Map<string, PickerColorway>()
  for (const variant of product.variants) {
    const key = colorwayKey(variant.color)
    const existing = unique.get(key)
    if (!existing) {
      unique.set(key, {
        key,
        name: variant.color,
        imageUrl: variant.imageUrl,
        colorHex: variant.colorHex,
      })
      continue
    }
    if (!existing.imageUrl && variant.imageUrl) {
      existing.imageUrl = variant.imageUrl
    }
    if (!existing.colorHex && variant.colorHex) {
      existing.colorHex = variant.colorHex
    }
  }
  return [...unique.values()]
}

export function OrderItemPicker({
  catalog,
  value,
  onChange,
  compact,
  fillHeight,
}: {
  catalog: OrderImportPickerProduct[]
  value: OrderPickerSelectedLine[]
  onChange: (lines: OrderPickerSelectedLine[]) => void
  /** Tighter layout for spreadsheet modal. */
  compact?: boolean
  /** Stretch to parent height (modal). */
  fillHeight?: boolean
}) {
  const [query, setQuery] = useState('')
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  /** On small screens we drill into variants; desktop keeps side-by-side. */
  const [mobileStep, setMobileStep] = useState<'list' | 'variants'>('list')
  const [colorKey, setColorKey] = useState<string | null>(null)
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('EU')
  const [focusedSizeEu, setFocusedSizeEu] = useState<number | null>(null)

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
    filtered.find((product) => product.id === activeProductId) ?? null

  const colorOptions = useMemo(
    () => (activeProduct ? colorwaysForProduct(activeProduct) : []),
    [activeProduct],
  )

  const selectedColor =
    colorOptions.find((option) => option.key === colorKey) ??
    colorOptions[0] ??
    null

  const variantsForColor = useMemo(() => {
    if (!activeProduct || !selectedColor) return []
    return activeProduct.variants.filter(
      (variant) => colorwayKey(variant.color) === selectedColor.key,
    )
  }, [activeProduct, selectedColor])

  const sizesForColor = useMemo(() => {
    const sizes = [
      ...new Set(
        variantsForColor
          .map((variant) => variant.sizeEu)
          .filter((size) => !isOneSizeEu(size)),
      ),
    ]
    return sizes.sort((a, b) => a - b)
  }, [variantsForColor])

  const isOneSizeColor =
    variantsForColor.length > 0 &&
    variantsForColor.every((variant) => isOneSizeEu(variant.sizeEu))

  const oneSizeVariant = isOneSizeColor ? variantsForColor[0] ?? null : null

  useEffect(() => {
    if (activeProductId && !filtered.some((p) => p.id === activeProductId)) {
      setActiveProductId(null)
      setMobileStep('list')
      setColorKey(null)
      setFocusedSizeEu(null)
    }
  }, [activeProductId, filtered])

  useEffect(() => {
    if (!activeProduct) {
      setColorKey(null)
      setFocusedSizeEu(null)
      return
    }
    const options = colorwaysForProduct(activeProduct)
    if (options.length === 0) {
      setColorKey(null)
      return
    }
    setColorKey((current) =>
      current && options.some((option) => option.key === current)
        ? current
        : options[0]!.key,
    )
    setFocusedSizeEu(null)
  }, [activeProduct])

  useEffect(() => {
    if (sizesForColor.length === 1) {
      setFocusedSizeEu(sizesForColor[0]!)
      return
    }
    if (focusedSizeEu == null) return
    if (!sizesForColor.includes(focusedSizeEu)) {
      setFocusedSizeEu(null)
    }
  }, [focusedSizeEu, sizesForColor])

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
        image: variant.imageUrl || product.image,
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

  const openProduct = (productId: string) => {
    setActiveProductId(productId)
    setMobileStep('variants')
  }

  const variantForSize = (sizeEu: number) =>
    variantsForColor.find((variant) => variant.sizeEu === sizeEu) ?? null

  const selectSize = (sizeEu: number) => {
    if (!activeProduct) return
    const variant = variantForSize(sizeEu)
    if (!variant || variant.stock <= 0) return
    setFocusedSizeEu(sizeEu)
    const existing = selectedByVariant.get(variant.id)
    if (!existing) {
      setQuantity(activeProduct, variant.id, 1)
    }
  }

  const panelHeight = fillHeight
    ? 'min-h-0 flex-1'
    : 'min-h-0 max-h-[min(22rem,48dvh)] flex-1 md:max-h-[min(28rem,55vh)]'

  const focusedVariant =
    focusedSizeEu != null ? variantForSize(focusedSizeEu) : oneSizeVariant
  const focusedQty = focusedVariant
    ? (selectedByVariant.get(focusedVariant.id)?.quantity ?? 0)
    : 0

  const productList = (
    <div
      className={`${panelHeight} overflow-y-auto overscroll-contain rounded-xl border border-cloud bg-white`}
    >
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
              onClick={() => openProduct(product.id)}
              className={[
                'flex w-full items-center gap-2.5 border-b border-cloud px-2.5 py-2 text-left last:border-0',
                isActive ? 'bg-navy/[0.06]' : 'active:bg-mist/70 md:hover:bg-mist/70',
              ].join(' ')}
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-mist sm:h-11 sm:w-11">
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
  )

  const showColorPicker = colorOptions.length > 1
  const showSizePicker = !isOneSizeColor && sizesForColor.length > 0

  const variantPanel = (
    <div
      className={`flex ${panelHeight} flex-col overflow-hidden rounded-xl border border-cloud bg-white`}
    >
      {!activeProduct ? (
        <p className="hidden py-10 text-center text-[13px] text-mute md:block">
          Pick a product to choose color & size.
        </p>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-cloud px-2.5 py-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-mist hover:text-ink md:hidden"
              onClick={() => setMobileStep('list')}
              aria-label="Back to products"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-mist">
              <SafeImage
                src={selectedColor?.imageUrl || activeProduct.image}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">
                {activeProduct.name}
              </p>
              <p className="text-[11px] text-mute">
                {formatPrice(activeProduct.price)}
                {selectedColor?.name ? ` · ${selectedColor.name}` : ''}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
            {showColorPicker ? (
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  Color
                  {selectedColor?.name ? (
                    <span className="font-normal text-mute">
                      : {selectedColor.name}
                    </span>
                  ) : null}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {colorOptions.map((option) => {
                    const selectedOnColor = activeProduct.variants.some(
                      (variant) =>
                        colorwayKey(variant.color) === option.key &&
                        selectedByVariant.has(variant.id),
                    )
                    const isActive = selectedColor?.key === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-label={
                          option.name
                            ? `Color ${option.name}`
                            : `Color ${option.key}`
                        }
                        title={option.name}
                        onClick={() => {
                          setColorKey(option.key)
                          setFocusedSizeEu(null)
                        }}
                        className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border bg-white transition ${
                          isActive
                            ? 'border-navy'
                            : 'border-cloud hover:border-navy/40'
                        }`}
                        aria-pressed={isActive}
                      >
                        {option.imageUrl ? (
                          <SafeImage
                            src={option.imageUrl}
                            alt=""
                            maxWidth={96}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : option.colorHex ? (
                          <span
                            className="absolute inset-0"
                            style={{ backgroundColor: option.colorHex }}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-mist text-[10px] font-semibold uppercase text-mute">
                            {(option.name ?? '?').slice(0, 2)}
                          </span>
                        )}
                        {selectedOnColor ? (
                          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-navy ring-1 ring-white" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : selectedColor?.name ? (
              <p className="text-[13px] font-semibold text-ink">
                Color
                <span className="font-normal text-mute">
                  : {selectedColor.name}
                </span>
              </p>
            ) : null}

            {showSizePicker ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">
                    Size
                    <span className="font-normal text-mute">
                      :{' '}
                      {focusedSizeEu != null
                        ? formatSizeLabel(focusedSizeEu, sizeUnit)
                        : 'Please select'}
                    </span>
                  </p>
                  <div
                    role="group"
                    aria-label="Size unit"
                    className="inline-flex rounded-full border border-cloud p-0.5 text-[11px] font-semibold"
                  >
                    {(['EU', 'UK'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setSizeUnit(unit)}
                        className={`rounded-full px-2.5 py-1 transition ${
                          sizeUnit === unit
                            ? 'bg-navy text-white'
                            : 'text-mute hover:text-ink'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {sizesForColor.map((sizeEu) => {
                    const variant = variantForSize(sizeEu)
                    const qty = variant
                      ? (selectedByVariant.get(variant.id)?.quantity ?? 0)
                      : 0
                    const inStock = (variant?.stock ?? 0) > 0
                    return (
                      <div key={sizeEu} className="relative">
                        <SizeOptionButton
                          label={formatSizeLabel(sizeEu, sizeUnit)}
                          available={inStock}
                          selected={focusedSizeEu === sizeEu || qty > 0}
                          onSelect={() => selectSize(sizeEu)}
                        />
                        {qty > 0 ? (
                          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-semibold text-white">
                            {qty}
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {focusedVariant ? (
              <div className="rounded-xl border border-cloud bg-mist/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-ink">
                      {isOneSizeColor
                        ? selectedColor?.name || 'Selected'
                        : `EU ${focusedVariant.sizeEu} · ${focusedVariant.color}`}
                    </p>
                    <p className="text-[11px] text-mute">
                      {formatPrice(focusedVariant.unitPrice)}
                      {focusedVariant.stock <= 0
                        ? ' · Out of stock'
                        : ` · ${focusedVariant.stock} in stock`}
                    </p>
                  </div>
                  {focusedVariant.stock > 0 || focusedQty > 0 ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cloud bg-white"
                        onClick={() =>
                          setQuantity(
                            activeProduct,
                            focusedVariant.id,
                            focusedQty - 1,
                          )
                        }
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        value={focusedQty}
                        onChange={(event) => {
                          const next = Number(event.target.value)
                          if (!Number.isFinite(next)) return
                          setQuantity(
                            activeProduct,
                            focusedVariant.id,
                            next,
                          )
                        }}
                        className="h-8 w-10 rounded-md border border-cloud bg-white text-center text-[12px] outline-none focus:border-navy"
                        inputMode="numeric"
                        aria-label="Quantity"
                      />
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cloud bg-white"
                        disabled={focusedVariant.stock <= 0 && focusedQty <= 0}
                        onClick={() =>
                          setQuantity(
                            activeProduct,
                            focusedVariant.id,
                            focusedQty + 1,
                          )
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {isOneSizeColor && focusedQty <= 0 && focusedVariant.stock > 0 ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg bg-navy text-[12px] font-semibold text-white hover:bg-navy-deep"
                    onClick={() =>
                      setQuantity(activeProduct, focusedVariant.id, 1)
                    }
                  >
                    Add to order
                  </button>
                ) : null}
              </div>
            ) : showSizePicker ? (
              <p className="text-[12px] text-mute">
                Tap a size to add it. You can add several sizes.
              </p>
            ) : (
              <p className="text-[12px] text-mute">
                No sizes available for this color.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div
      className={[
        'flex min-h-0 flex-col',
        fillHeight ? 'h-full' : '',
        compact ? 'gap-2.5' : 'gap-3',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setMobileStep('list')
          }}
          placeholder="Search product, color, or SKU…"
          className="h-9 w-full rounded-lg border border-cloud bg-white py-2 pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-mute focus:border-navy"
        />
      </div>

      {/* Mobile: one panel at a time. Desktop: side by side. */}
      <div className="hidden min-h-0 flex-1 gap-3 md:grid md:grid-cols-2">
        {productList}
        {variantPanel}
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {mobileStep === 'list' ? productList : variantPanel}
      </div>

      <div className="shrink-0 rounded-xl border border-cloud bg-mist/40 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-[12px] font-semibold text-ink">
            Selected · {summarizePickerLines(value) || 'none'}
          </p>
          {value.length > 0 ? (
            <button
              type="button"
              className="shrink-0 text-[12px] font-semibold text-spark hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          ) : null}
        </div>
        {value.length === 0 ? (
          <p className="text-[11px] text-mute">
            Tap a product, then pick color & size.
          </p>
        ) : (
          <ul className="max-h-28 space-y-1 overflow-y-auto overscroll-contain sm:max-h-36">
            {value.map((line) => (
              <li
                key={line.key}
                className="flex items-center gap-2 rounded-lg bg-white px-2 py-1"
              >
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-mist">
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
                    {isOneSizeEu(line.sizeEu)
                      ? line.color
                      : `EU ${line.sizeEu} · ${line.color}`}{' '}
                    ×{line.quantity}
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
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-ink/45 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-[91] flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[min(90vh,52rem)] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Add products"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cloud px-3 py-2.5 sm:px-4">
          <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Add products
          </h3>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-mist hover:text-ink"
            onClick={onClose}
            aria-label="Close picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3 py-2.5 sm:px-4 sm:py-3">
          <OrderItemPicker
            catalog={catalog}
            value={value}
            onChange={onChange}
            compact
            fillHeight
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-cloud bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg border border-cloud bg-white px-3 text-[12px] font-semibold text-ink"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-lg bg-navy px-3 text-[12px] font-semibold text-white hover:bg-navy-deep"
            onClick={onDone}
          >
            Done · {value.length}
          </button>
        </div>
      </div>
    </div>
  )
}
