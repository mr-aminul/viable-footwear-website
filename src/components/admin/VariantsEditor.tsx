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
import { ImageOff, ImagePlus, Trash2 } from 'lucide-react'
import {
  clearColorwayMedia,
  updateMediaColor,
  uploadProductMedia,
} from '@/lib/catalog/actions/media'
import { normalizeColorHex } from '@/lib/catalog/gallery'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { Field, inputClassName } from '@/components/admin/ui'

export type VariantDraft = {
  key: string
  id?: string
  size_eu: string
  color: string
  color_hex: string
  sku: string
  stock: string
  active: boolean
}

export type VariantImageOption = {
  id: string
  url: string
  colorHex: string | null
}

export function createEmptyVariantDraft(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size_eu: '40',
    color: '',
    color_hex: '#1A3668',
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
      sku: row.sku || null,
      stock: Number(row.stock),
      active: row.active,
    })),
  )
}

function normalizeHex(value: string): string {
  return normalizeColorHex(value) ?? '#1A3668'
}

/**
 * Variant table — edits only; parent Save product persists size/color/stock.
 * Images are tagged to a colorway immediately (gallery pool + multi-select).
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
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-3 py-3">Images</th>
              <th className="px-3 py-3">Size EU</th>
              <th className="px-3 py-3">Color</th>
              <th className="px-3 py-3">Swatch</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-cloud last:border-0">
                <td className="px-3 py-2">
                  <VariantImagePicker
                    productId={productId}
                    colorHex={normalizeHex(row.color_hex)}
                    images={images}
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
                    className={inputClassName}
                    placeholder="Navy"
                  />
                </td>
                <td className="px-3 py-2">
                  <VariantColorSwatch
                    value={row.color_hex}
                    onChange={(hex) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key ? { ...r, color_hex: hex } : r,
                        ),
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.sku}
                    onChange={(e) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key ? { ...r, sku: e.target.value } : r,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={row.stock}
                    onChange={(e) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key
                            ? { ...r, stock: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className={inputClassName}
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
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] text-mute">
        Images are shared by color swatch (all sizes of the same color). Upload
        here or in the gallery above, then multi-select in the picker.
      </p>

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

function VariantImagePicker({
  productId,
  colorHex,
  images,
}: {
  productId: string
  colorHex: string
  images: VariantImageOption[]
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

  const selected = images.filter(
    (img) => normalizeColorHex(img.colorHex) === colorHex,
  )
  const preview = selected.slice(0, 3)

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

  const refresh = () => router.refresh()

  const toggleImage = (mediaId: string, currentlySelected: boolean) => {
    setError(null)
    startTransition(async () => {
      const result = await updateMediaColor(
        mediaId,
        currentlySelected ? null : colorHex,
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      refresh()
    })
  }

  const clearAll = () => {
    setError(null)
    startTransition(async () => {
      const result = await clearColorwayMedia(productId, colorHex)
      if (!result.ok) {
        setError(result.error)
        return
      }
      refresh()
    })
  }

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('color_hex', colorHex)
    startTransition(async () => {
      const result = await uploadProductMedia(productId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      refresh()
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Choose color images"
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
        {preview.length > 0 ? (
          preview.map((img) => (
            <span
              key={img.id}
              className="h-9 w-9 overflow-hidden rounded-lg bg-mist/50"
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
          ))
        ) : (
          <span className="px-2 text-[10px] font-semibold text-mute">Pick</span>
        )}
        {selected.length > 3 ? (
          <span className="pr-1 text-[10px] font-semibold text-mute">
            +{selected.length - 3}
          </span>
        ) : null}
      </button>

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Color gallery images"
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

              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  Color images
                </p>
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-white/30"
                  style={{ backgroundColor: colorHex }}
                  aria-hidden
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || selected.length === 0}
                  onClick={clearAll}
                  className={[
                    'flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed text-[10px] font-semibold transition',
                    selected.length === 0
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/25 text-white/70 hover:border-white/50 hover:text-white disabled:opacity-40',
                  ].join(' ')}
                >
                  <ImageOff className="h-3.5 w-3.5" />
                  None
                </button>

                {images.map((img, index) => {
                  const isSelected =
                    normalizeColorHex(img.colorHex) === colorHex
                  const otherColor =
                    img.colorHex &&
                    normalizeColorHex(img.colorHex) !== colorHex
                  return (
                    <button
                      key={img.id}
                      type="button"
                      disabled={pending}
                      aria-pressed={isSelected}
                      aria-label={`Image ${index + 1}${isSelected ? ', selected' : ''}`}
                      onClick={() => toggleImage(img.id, isSelected)}
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
                      {otherColor ? (
                        <span
                          className="absolute bottom-1 left-1 h-2 w-2 rounded-full ring-1 ring-white"
                          style={{
                            backgroundColor:
                              normalizeColorHex(img.colorHex) ?? '#888',
                          }}
                          title="Tagged to another color"
                        />
                      ) : null}
                    </button>
                  )
                })}

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-white/30 text-white/80 transition hover:border-white/60 hover:text-white disabled:opacity-60"
                  aria-label="Upload image for this color"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[10px] font-semibold">
                    {pending ? '…' : 'Add'}
                  </span>
                </button>
              </div>

              {error ? (
                <p className="mt-2 text-[11px] text-spark-soft">{error}</p>
              ) : (
                <p className="mt-2 text-[11px] text-white/50">
                  Tap to select multiple. Uploads also appear in the gallery.
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function VariantColorSwatch({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hex = normalizeHex(value)

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Pick color ${hex}`}
        title={hex}
        onClick={() => inputRef.current?.click()}
        className="h-9 w-9 rounded-full border-2 border-navy/20 transition hover:scale-105"
        style={{
          backgroundColor: hex,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
      />
    </div>
  )
}
