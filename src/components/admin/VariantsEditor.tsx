'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ImageOff, ImagePlus, Minus, Plus, Trash2 } from 'lucide-react'
import { uploadProductMedia } from '@/lib/catalog/actions/media'
import { prepareMediaFileForUpload } from '@/lib/catalog/compress-image-client'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { Field, inputClassName } from '@/components/admin/ui'

export type VariantDraft = {
  key: string
  id?: string
  size_eu: string
  color: string
  color_hex: string
  media_id: string | null
  sku: string
  stock: string
  active: boolean
}

export type VariantImageOption = {
  id: string
  url: string
}

export function createEmptyVariantDraft(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size_eu: '40',
    color: '',
    color_hex: '',
    media_id: null,
    sku: '',
    stock: '0',
    active: true,
  }
}

export function buildVariantsPayload(rows: VariantDraft[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      size_eu: Number(row.size_eu),
      color: row.color || null,
      color_hex: row.color_hex || null,
      media_id: row.media_id || null,
      sku: row.sku || null,
      stock: Number(row.stock),
      active: row.active,
    })),
  )
}

function normalizeColorName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** Client-side check before save — mirrors server rules. */
export function validateVariantDrafts(rows: VariantDraft[]): string | null {
  const active = rows.filter((r) => r.active)
  if (active.length === 0) return null

  for (const row of active) {
    if (!normalizeColorName(row.color)) {
      return 'Every active variant needs a color name (e.g. Navy, Black).'
    }
  }

  const byColor = new Map<string, VariantDraft[]>()
  for (const row of active) {
    const key = normalizeColorName(row.color).toLowerCase()
    const list = byColor.get(key) ?? []
    list.push(row)
    byColor.set(key, list)
  }

  // Same color across sizes is fine. Different photos under one color name
  // usually means the merchant forgot to rename a colorway.
  for (const [, group] of byColor) {
    if (group.length < 2) continue
    const imageIds = new Set(
      group.map((r) => r.media_id).filter((id): id is string => Boolean(id)),
    )
    if (imageIds.size > 1) {
      return `“${group[0].color.trim()}” has different images on different sizes. Use one photo per color, or give each colorway its own name.`
    }
    const sizes = group.map((r) => r.size_eu.trim())
    if (new Set(sizes).size !== sizes.length) {
      return `Duplicate size under color “${group[0].color.trim()}”.`
    }
  }

  return null
}

/**
 * Variant table — edits only; parent Save product persists size/color/stock/image.
 * Images are assigned per row. Same color name = same colorway on the storefront.
 */
export function VariantsEditor({
  productId,
  rows,
  onChange,
  images,
}: {
  productId: string
  rows: VariantDraft[]
  onChange: (rows: VariantDraft[]) => void
  images: VariantImageOption[]
}) {
  const setMediaId = (rowKey: string, mediaId: string | null) => {
    onChange(
      rows.map((r) => (r.key === rowKey ? { ...r, media_id: mediaId } : r)),
    )
  }

  const applyMediaToColor = (rowKey: string, mediaId: string | null) => {
    const source = rows.find((r) => r.key === rowKey)
    if (!source) return
    const colorKey = normalizeColorName(source.color).toLowerCase()
    if (!colorKey) {
      setMediaId(rowKey, mediaId)
      return
    }
    onChange(
      rows.map((r) =>
        normalizeColorName(r.color).toLowerCase() === colorKey
          ? { ...r, media_id: mediaId }
          : r,
      ),
    )
  }

  const colorSiblingCount = (row: VariantDraft) => {
    const colorKey = normalizeColorName(row.color).toLowerCase()
    if (!colorKey) return 0
    return rows.filter(
      (r) =>
        r.key !== row.key &&
        normalizeColorName(r.color).toLowerCase() === colorKey,
    ).length
  }

  const draftError = validateVariantDrafts(rows)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Size EU</th>
              <th className="px-3 py-3">Color</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const colorMissing =
                row.active && !normalizeColorName(row.color)
              const siblings = colorSiblingCount(row)
              return (
                <tr
                  key={row.key}
                  className="border-b border-cloud last:border-0"
                >
                  <td className="px-3 py-2">
                    <VariantImagePicker
                      productId={productId}
                      mediaId={row.media_id}
                      images={images}
                      colorLabel={normalizeColorName(row.color) || null}
                      siblingCount={siblings}
                      onSelect={(mediaId) => setMediaId(row.key, mediaId)}
                      onApplyToColor={(mediaId) =>
                        applyMediaToColor(row.key, mediaId)
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.size_eu}
                      onChange={(e) =>
                        onChange(
                          rows.map((r) =>
                            r.key === row.key
                              ? { ...r, size_eu: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.color}
                      onChange={(e) =>
                        onChange(
                          rows.map((r) =>
                            r.key === row.key
                              ? { ...r, color: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className={[
                        inputClassName,
                        colorMissing
                          ? 'border-spark/50 ring-1 ring-spark/20'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      placeholder="Navy"
                      aria-invalid={colorMissing}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.sku}
                      onChange={(e) =>
                        onChange(
                          rows.map((r) =>
                            r.key === row.key
                              ? { ...r, sku: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <StockStepper
                      value={row.stock}
                      onChange={(stock) =>
                        onChange(
                          rows.map((r) =>
                            r.key === row.key ? { ...r, stock } : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.active}
                      aria-label={row.active ? 'Active' : 'Inactive'}
                      onClick={() =>
                        onChange(
                          rows.map((r) =>
                            r.key === row.key
                              ? { ...r, active: !r.active }
                              : r,
                          ),
                        )
                      }
                      className={[
                        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                        row.active ? 'bg-navy' : 'bg-cloud',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                          row.active ? 'translate-x-5' : 'translate-x-0',
                        ].join(' ')}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      aria-label="Delete variant"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-spark transition hover:bg-spark/10"
                      onClick={() =>
                        onChange(rows.filter((r) => r.key !== row.key))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {draftError ? (
        <p className="text-[13px] text-spark">{draftError}</p>
      ) : (
        <p className="text-[13px] text-mute">
          Name each color clearly (Navy, Black). Same name = same color across
          sizes. Image picks apply to that row only — use “Apply to all sizes”
          when you want the whole colorway to share a photo. Hit Save product to
          persist deletions and image assignments.
        </p>
      )}

      <AdminActionButton
        type="button"
        variant="secondary"
        onClick={() => onChange([...rows, createEmptyVariantDraft()])}
      >
        Add variant
      </AdminActionButton>

      <Field
        label="Tip"
        hint="A product needs at least one active variant to stay published."
      >
        <span />
      </Field>
    </div>
  )
}

function parseStock(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

function StockStepper({
  value,
  onChange,
}: {
  value: string
  onChange: (stock: string) => void
}) {
  const stock = parseStock(value)
  const canDecrease = stock > 0

  return (
    <div className="inline-flex w-[5.5rem] items-center rounded-lg border border-cloud bg-white focus-within:border-navy">
      <button
        type="button"
        aria-label="Decrease stock"
        disabled={!canDecrease}
        onClick={() => onChange(String(stock - 1))}
        className="flex h-8 w-6 shrink-0 items-center justify-center text-ink transition hover:bg-mist/60 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (value !== String(stock)) onChange(String(stock))
        }}
        aria-label="Stock"
        className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1.5 text-center text-[13px] text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase stock"
        onClick={() => onChange(String(stock + 1))}
        className="flex h-8 w-6 shrink-0 items-center justify-center text-ink transition hover:bg-mist/60"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function VariantImagePicker({
  productId,
  mediaId,
  images,
  colorLabel,
  siblingCount,
  onSelect,
  onApplyToColor,
}: {
  productId: string
  mediaId: string | null
  images: VariantImageOption[]
  colorLabel: string | null
  siblingCount: number
  onSelect: (mediaId: string | null) => void
  onApplyToColor: (mediaId: string | null) => void
}) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null,
  )

  const selected = images.find((img) => img.id === mediaId) ?? null
  const canApplyToColor = Boolean(colorLabel) && siblingCount > 0

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelWidth = Math.min(320, window.innerWidth - 24)
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - panelWidth - 12,
    )
    setPanelPos({
      top: rect.bottom + 8,
      left,
    })
  }, [open, images.length])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onReposition = () => setOpen(false)
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open])

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    startTransition(async () => {
      const prepared = await prepareMediaFileForUpload(file)
      const formData = new FormData()
      formData.set('file', prepared.file)
      const result = await uploadProductMedia(productId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.data?.id) {
        onSelect(result.data.id)
      }
      router.refresh()
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Choose variant image"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'inline-flex h-11 min-w-11 items-center gap-1 rounded-xl border bg-white px-1 transition',
          open
            ? 'border-navy ring-2 ring-navy/20'
            : 'border-cloud hover:border-navy/40',
        ].join(' ')}
      >
        {selected ? (
          <span className="h-9 w-9 overflow-hidden rounded-lg bg-mist/50">
            <img
              src={selected.url}
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
        ) : (
          <span className="px-2 text-[10px] font-semibold text-mute">Pick</span>
        )}
      </button>

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Variant image"
              style={{ top: panelPos.top, left: panelPos.left }}
              className="fixed z-[80] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl bg-ink p-3 shadow-lift"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={onUpload}
              />

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Variant image
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || !mediaId}
                  onClick={() => onSelect(null)}
                  className={[
                    'flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed text-[10px] font-semibold transition',
                    !mediaId
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/25 text-white/70 hover:border-white/50 hover:text-white disabled:opacity-40',
                  ].join(' ')}
                >
                  <ImageOff className="h-3.5 w-3.5" />
                  None
                </button>

                {images.map((img, index) => {
                  const isSelected = img.id === mediaId
                  return (
                    <button
                      key={img.id}
                      type="button"
                      disabled={pending}
                      aria-pressed={isSelected}
                      aria-label={`Image ${index + 1}${isSelected ? ', selected' : ''}`}
                      onClick={() => onSelect(isSelected ? null : img.id)}
                      className={[
                        'relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-white transition disabled:opacity-60',
                        isSelected
                          ? 'border-navy ring-2 ring-white/40'
                          : 'border-transparent hover:border-white/40',
                      ].join(' ')}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  )
                })}

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-white/30 text-white/80 transition hover:border-white/60 hover:text-white disabled:opacity-60"
                  aria-label="Upload image for this variant"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[10px] font-semibold">
                    {pending ? '…' : 'Add'}
                  </span>
                </button>
              </div>

              {canApplyToColor && mediaId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onApplyToColor(mediaId)}
                  className="mt-2 w-full rounded-lg border border-white/20 px-2 py-1.5 text-[11px] font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  Apply to all {siblingCount + 1} “{colorLabel}” sizes
                </button>
              ) : null}

              {error ? (
                <p className="mt-2 text-[11px] text-spark-soft">{error}</p>
              ) : (
                <p className="mt-2 text-[11px] text-white/50">
                  {canApplyToColor
                    ? 'Applies to this size only unless you use the button above.'
                    : 'One image per variant row. Uploads also appear in the gallery.'}
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
