'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  updateMediaColorway,
  uploadProductMedia,
} from '@/lib/catalog/actions/media'
import { prepareMediaFileForUpload } from '@/lib/catalog/compress-image-client'
import { colorwayKey } from '@/lib/catalog/colorway'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { ONE_SIZE_EU } from '@/lib/catalog/sizing'

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
  color: string | null
}

export function createEmptyVariantDraft(
  color = '',
  requiresSize = true,
): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size_eu: requiresSize ? '40' : String(ONE_SIZE_EU),
    color,
    color_hex: '',
    media_id: null,
    sku: '',
    stock: '0',
    active: true,
  }
}

/**
 * Collapse each color to a single one-size row (keeps first row's id/stock/sku).
 */
export function collapseToOneSizePerColor(rows: VariantDraft[]): VariantDraft[] {
  const groups = groupByColor(rows)
  return groups.map((group) => {
    const primary = group.rows[0]!
    return {
      ...primary,
      size_eu: String(ONE_SIZE_EU),
      color: group.color || primary.color,
    }
  })
}

/** Restore editable sizes when turning size variation back on. */
export function expandFromOneSize(rows: VariantDraft[]): VariantDraft[] {
  return rows.map((row) => ({
    ...row,
    size_eu:
      Number(row.size_eu) === ONE_SIZE_EU || !row.size_eu.trim()
        ? '40'
        : row.size_eu,
  }))
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
export function validateVariantDrafts(
  rows: VariantDraft[],
  requiresSizeOrOptions:
    | boolean
    | { requiresSize?: boolean; forPublish?: boolean } = true,
): string | null {
  const options =
    typeof requiresSizeOrOptions === 'boolean'
      ? { requiresSize: requiresSizeOrOptions, forPublish: false }
      : requiresSizeOrOptions
  const requiresSize = options.requiresSize !== false
  const forPublish = Boolean(options.forPublish)

  const active = rows.filter((r) => r.active)
  if (forPublish && active.length === 0) {
    return requiresSize
      ? 'Add at least one size/color on sale before going live.'
      : 'Add at least one color on sale before going live.'
  }
  if (active.length === 0) return null

  for (const row of active) {
    if (!normalizeColorName(row.color)) {
      return 'Every color needs a name (e.g. Grey, Black).'
    }
    if (requiresSize) {
      const size = Number(row.size_eu)
      if (!Number.isFinite(size) || size <= 0) {
        return 'Every size row needs a valid EU size.'
      }
    }
  }

  const byColor = new Map<string, VariantDraft[]>()
  for (const row of active) {
    const key = normalizeColorName(row.color).toLowerCase()
    const list = byColor.get(key) ?? []
    list.push(row)
    byColor.set(key, list)
  }

  for (const [, group] of byColor) {
    if (!requiresSize && group.length > 1) {
      return `“${group[0].color.trim()}” should only have one stock row when sizes are off.`
    }
    const sizes = group.map((r) => r.size_eu.trim())
    if (new Set(sizes).size !== sizes.length) {
      return `“${group[0].color.trim()}” has the same size twice.`
    }
  }

  return null
}

type ColorGroup = {
  /** Stable id for React keys — does not change while typing a name. */
  id: string
  key: string
  color: string
  rows: VariantDraft[]
}

function groupByColor(rows: VariantDraft[]): ColorGroup[] {
  const groups: ColorGroup[] = []
  const indexByKey = new Map<string, number>()

  for (const row of rows) {
    const name = normalizeColorName(row.color)
    const key = name ? colorwayKey(name) : `untitled:${row.key}`
    const existing = indexByKey.get(key)
    if (existing != null) {
      groups[existing].rows.push(row)
      if (!groups[existing].color && name) groups[existing].color = name
      continue
    }
    indexByKey.set(key, groups.length)
    groups.push({
      id: row.key,
      key,
      color: name,
      rows: [row],
    })
  }

  return groups
}

function parseStock(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

const fieldClass =
  'w-full rounded-md border border-cloud bg-white px-2 py-1.5 text-[13px] text-ink outline-none transition placeholder:text-mute/70 focus:border-navy'

/**
 * Nested list: each color holds its photos + sizes (or a single stock row when
 * the product does not use size variation).
 */
export function VariantsEditor({
  productId,
  rows,
  onChange,
  images,
  requiresSize = true,
}: {
  productId: string
  rows: VariantDraft[]
  onChange: (rows: VariantDraft[]) => void
  images: VariantImageOption[]
  /** When false, each color is one-size — no size column / add-size. */
  requiresSize?: boolean
}) {
  const groups = useMemo(() => groupByColor(rows), [rows])
  const draftError = validateVariantDrafts(rows, requiresSize)

  // Optimistic color tags — UI updates instantly; server syncs in background.
  const [colorByMediaId, setColorByMediaId] = useState(() =>
    new Map(images.map((img) => [img.id, img.color])),
  )
  useEffect(() => {
    setColorByMediaId(new Map(images.map((img) => [img.id, img.color])))
  }, [images])

  const liveImages = useMemo(
    () =>
      images.map((img) => ({
        ...img,
        color: colorByMediaId.has(img.id)
          ? (colorByMediaId.get(img.id) ?? null)
          : img.color,
      })),
    [images, colorByMediaId],
  )

  const tagMediaColor = (mediaId: string, color: string | null) => {
    setColorByMediaId((prev) => {
      const next = new Map(prev)
      next.set(mediaId, color)
      return next
    })
    void updateMediaColorway(mediaId, color)
  }

  // Start expanded so people see sizes immediately.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const isOpen = (key: string) => !collapsed.has(key)

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const replaceGroupRows = (groupKey: string, nextGroupRows: VariantDraft[]) => {
    const group = groups.find((g) => g.key === groupKey)
    if (!group) return
    const groupKeys = new Set(group.rows.map((r) => r.key))
    const result: VariantDraft[] = []
    let inserted = false
    for (const row of rows) {
      if (!groupKeys.has(row.key)) {
        result.push(row)
        continue
      }
      if (!inserted) {
        result.push(...nextGroupRows)
        inserted = true
      }
    }
    if (!inserted) result.push(...nextGroupRows)
    onChange(result)
  }

  const renameColor = (groupKey: string, nextColor: string) => {
    const group = groups.find((g) => g.key === groupKey)
    if (!group) return
    const nextKey = colorwayKey(nextColor)
    const primaryId =
      liveImages.find((img) => colorwayKey(img.color) === nextKey)?.id ??
      group.rows.find((r) => r.media_id)?.media_id ??
      null
    replaceGroupRows(
      groupKey,
      group.rows.map((r) => ({
        ...r,
        color: nextColor,
        media_id: primaryId,
      })),
    )
  }

  const commitRename = (
    groupKey: string,
    previousColor: string,
    nextColor: string,
  ) => {
    const previousKey = colorwayKey(previousColor)
    const nextKey = colorwayKey(nextColor)
    if (
      !previousKey ||
      previousKey === 'default' ||
      !nextKey ||
      nextKey === previousKey ||
      !nextColor.trim()
    ) {
      return
    }
    const label = nextColor.trim()
    const toRetag = liveImages.filter(
      (img) => colorwayKey(img.color) === previousKey,
    )
    if (toRetag.length === 0) return
    setColorByMediaId((prev) => {
      const next = new Map(prev)
      for (const img of toRetag) next.set(img.id, label)
      return next
    })
    for (const img of toRetag) void updateMediaColorway(img.id, label)
  }

  const setPrimaryImage = (groupKey: string, mediaId: string | null) => {
    const group = groups.find((g) => g.key === groupKey)
    if (!group) return
    replaceGroupRows(
      groupKey,
      group.rows.map((r) => ({ ...r, media_id: mediaId })),
    )
  }

  const addSize = (groupKey: string) => {
    if (!requiresSize) return
    const group = groups.find((g) => g.key === groupKey)
    if (!group) return
    const primary =
      group.rows.find((r) => r.media_id)?.media_id ??
      liveImages.find(
        (img) => colorwayKey(img.color) === colorwayKey(group.color),
      )?.id ??
      null
    const sizes = group.rows
      .map((r) => Number(r.size_eu))
      .filter((n) => Number.isFinite(n) && n > 0)
    const nextSize = sizes.length > 0 ? String(Math.max(...sizes) + 1) : '40'
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.delete(groupKey)
      return next
    })
    replaceGroupRows(groupKey, [
      ...group.rows,
      {
        ...createEmptyVariantDraft(group.color, true),
        size_eu: nextSize,
        media_id: primary,
      },
    ])
  }

  const addColor = () => {
    const draft = createEmptyVariantDraft('', requiresSize)
    onChange([...rows, draft])
  }

  if (groups.length === 0) {
    return (
      <AdminActionButton type="button" onClick={addColor}>
        Add color
      </AdminActionButton>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {groups.map((group) => {
          const open = isOpen(group.key)
          const colorImages = liveImages.filter(
            (img) =>
              group.color &&
              colorwayKey(img.color) === colorwayKey(group.color),
          )
          const primaryId =
            group.rows.find((r) => r.media_id)?.media_id ??
            colorImages[0]?.id ??
            null
          const needsName = !normalizeColorName(group.color)

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl border border-cloud bg-white"
            >
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? 'Hide sizes' : 'Show sizes'}
                  onClick={() => toggle(group.key)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mute transition hover:bg-mist hover:text-ink"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                <ColorPhotos
                  productId={productId}
                  colorLabel={group.color}
                  images={liveImages}
                  colorImages={colorImages}
                  primaryId={primaryId}
                  onPrimaryChange={(mediaId) =>
                    setPrimaryImage(group.key, mediaId)
                  }
                  onTagColor={tagMediaColor}
                />

                <ColorNameField
                  value={group.color}
                  needsName={needsName}
                  onCommit={(next, previous) => {
                    renameColor(group.key, next)
                    commitRename(group.key, previous, next)
                  }}
                />

                <span className="min-w-0 flex-1" />

                <button
                  type="button"
                  aria-label="Remove this color"
                  title="Remove this color"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-spark transition hover:bg-spark/10"
                  onClick={() => {
                    const keys = new Set(group.rows.map((r) => r.key))
                    onChange(rows.filter((r) => !keys.has(r.key)))
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {open ? (
                <div className="border-t border-cloud">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-[13px]">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-mute">
                          {requiresSize ? (
                            <th className="px-3 py-2 font-semibold sm:pl-[3.25rem]">
                              Size (EU)
                            </th>
                          ) : (
                            <th className="px-3 py-2 font-semibold sm:pl-[3.25rem]">
                              Stock
                            </th>
                          )}
                          <th className="px-3 py-2 font-semibold">SKU</th>
                          {requiresSize ? (
                            <th className="px-3 py-2 font-semibold">Stock</th>
                          ) : null}
                          <th className="px-3 py-2 font-semibold">On sale</th>
                          {requiresSize ? (
                            <th className="w-10 px-2 py-2" />
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-t border-cloud/70"
                          >
                            {requiresSize ? (
                              <td className="px-3 py-1.5 sm:pl-[3.25rem]">
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
                                  className={`${fieldClass} w-[4.5rem]`}
                                  aria-label="Size EU"
                                />
                              </td>
                            ) : (
                              <td className="px-3 py-1.5 sm:pl-[3.25rem]">
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
                            )}
                            <td className="px-3 py-1.5">
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
                                className={fieldClass}
                                aria-label="SKU"
                              />
                            </td>
                            {requiresSize ? (
                              <td className="px-3 py-1.5">
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
                            ) : null}
                            <td className="px-3 py-1.5">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={row.active}
                                aria-label={
                                  row.active ? 'On sale' : 'Hidden'
                                }
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
                                  'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                                  row.active ? 'bg-navy' : 'bg-cloud',
                                ].join(' ')}
                              >
                                <span
                                  className={[
                                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                                    row.active
                                      ? 'translate-x-4'
                                      : 'translate-x-0',
                                  ].join(' ')}
                                />
                              </button>
                            </td>
                            {requiresSize ? (
                              <td className="px-2 py-1.5">
                                <button
                                  type="button"
                                  aria-label="Remove size"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-spark transition hover:bg-spark/10"
                                  onClick={() =>
                                    onChange(
                                      rows.filter((r) => r.key !== row.key),
                                    )
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {requiresSize ? (
                    <div className="border-t border-cloud px-3 py-2 sm:pl-[3.25rem]">
                      <button
                        type="button"
                        onClick={() => addSize(group.key)}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy transition hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add a size
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {draftError ? (
        <p className="text-[13px] text-spark">{draftError}</p>
      ) : null}

      <AdminActionButton type="button" variant="secondary" onClick={addColor}>
        Add another color
      </AdminActionButton>
    </div>
  )
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
    <div className="inline-flex w-[5.25rem] items-center rounded-md border border-cloud bg-white focus-within:border-navy">
      <button
        type="button"
        aria-label="Decrease stock"
        disabled={!canDecrease}
        onClick={() => onChange(String(stock - 1))}
        className="flex h-7 w-6 shrink-0 items-center justify-center text-ink transition hover:bg-mist/60 disabled:cursor-not-allowed disabled:opacity-35"
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
        className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1 text-center text-[13px] text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase stock"
        onClick={() => onChange(String(stock + 1))}
        className="flex h-7 w-6 shrink-0 items-center justify-center text-ink transition hover:bg-mist/60"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function ColorNameField({
  value,
  needsName,
  onCommit,
}: {
  value: string
  needsName: boolean
  onCommit: (next: string, previous: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const previousRef = useRef(value)

  useEffect(() => {
    setDraft(value)
    previousRef.current = value
  }, [value])

  return (
    <input
      value={draft}
      onFocus={() => {
        previousRef.current = draft
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === previousRef.current) return
        onCommit(draft, previousRef.current)
        previousRef.current = draft
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
      className={[
        fieldClass,
        'max-w-[14rem] font-semibold',
        needsName && !draft.trim() ? 'border-spark/50' : '',
      ].join(' ')}
      placeholder="Color name"
      aria-label="Color name"
    />
  )
}

function ColorPhotos({
  productId,
  colorLabel,
  images,
  colorImages,
  primaryId,
  onPrimaryChange,
  onTagColor,
}: {
  productId: string
  colorLabel: string
  images: VariantImageOption[]
  colorImages: VariantImageOption[]
  primaryId: string | null
  onPrimaryChange: (mediaId: string | null) => void
  onTagColor: (mediaId: string, color: string | null) => void
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  const assignedIds = useMemo(
    () => new Set(colorImages.map((img) => img.id)),
    [colorImages],
  )
  const galleryChoices = images.filter((img) => !assignedIds.has(img.id))

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return
    }

    const syncPosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const menuWidth = Math.min(17 * 16, window.innerWidth - 32)
      const menuHeight = menuRef.current?.offsetHeight ?? 160
      const gap = 6
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - menuWidth - 8,
      )
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const top =
        spaceBelow < menuHeight && rect.top > menuHeight + gap
          ? rect.top - menuHeight - gap
          : rect.bottom + gap
      setMenuStyle({
        position: 'fixed',
        top,
        left,
        zIndex: 80,
      })
    }

    syncPosition()

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', syncPosition, true)
    window.addEventListener('resize', syncPosition)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', syncPosition, true)
      window.removeEventListener('resize', syncPosition)
    }
  }, [open])

  const pickFromGallery = (mediaId: string) => {
    if (!colorLabel.trim()) {
      setError('Type a color name first.')
      return
    }
    setError(null)
    setOpen(false)
    // Instant UI — server sync is already fire-and-forget in onTagColor.
    onTagColor(mediaId, colorLabel.trim())
    onPrimaryChange(primaryId ?? mediaId)
  }

  const removePhoto = (mediaId: string) => {
    setError(null)
    onTagColor(mediaId, null)
    if (primaryId === mediaId) {
      const remaining = colorImages.filter((img) => img.id !== mediaId)
      onPrimaryChange(remaining[0]?.id ?? null)
    }
  }

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    if (!colorLabel.trim()) {
      setError('Type a color name first.')
      return
    }
    setError(null)
    setOpen(false)
    setUploading(true)
    void (async () => {
      const uploadedIds: string[] = []
      let lastError: string | null = null
      for (const file of files) {
        const prepared = await prepareMediaFileForUpload(file, { square: true })
        const formData = new FormData()
        formData.set('file', prepared.file)
        formData.set('color', colorLabel.trim())
        const result = await uploadProductMedia(productId, formData)
        if (!result.ok) {
          lastError = result.error
          break
        }
        if (result.data?.id) {
          uploadedIds.push(result.data.id)
          onTagColor(result.data.id, colorLabel.trim())
        }
      }
      setUploading(false)
      if (uploadedIds.length > 0) {
        onPrimaryChange(primaryId ?? uploadedIds[0]!)
      }
      if (lastError) setError(lastError)
      router.refresh()
    })()
  }

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={onUpload}
      />

      {colorImages.map((img, index) => {
        const isPrimary = img.id === primaryId || (!primaryId && index === 0)
        return (
          <div key={img.id} className="relative">
            <button
              type="button"
              aria-pressed={isPrimary}
              aria-label={`Photo ${index + 1}${isPrimary ? ' (main)' : ''}`}
              title={isPrimary ? 'Main photo' : 'Set as main photo'}
              onClick={() => onPrimaryChange(img.id)}
              className={[
                'h-9 w-9 overflow-hidden rounded-lg border bg-white transition',
                isPrimary
                  ? 'border-navy ring-2 ring-navy/20'
                  : 'border-cloud hover:border-navy/40',
              ].join(' ')}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-contain"
              />
            </button>
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => removePhoto(img.id)}
              className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-white"
            >
              <Trash2 className="h-2 w-2" />
            </button>
          </div>
        )
      })}

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Add photo"
        title="Add photo"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'flex h-9 w-9 items-center justify-center rounded-lg border border-dashed transition',
          open
            ? 'border-navy text-navy ring-2 ring-navy/15'
            : 'border-cloud text-mute hover:border-navy/40 hover:text-navy',
        ].join(' ')}
      >
        <ImagePlus className="h-3.5 w-3.5" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="dialog"
              aria-label="Choose photo"
              style={menuStyle ?? undefined}
              className="w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-cloud bg-white p-2 shadow-card"
            >
              <div className="flex flex-wrap gap-1.5">
                {galleryChoices.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    aria-label={`Gallery image ${index + 1}`}
                    onClick={() => pickFromGallery(img.id)}
                    className="h-12 w-12 overflow-hidden rounded-lg border border-cloud bg-mist/30 transition hover:border-navy/40"
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-cloud text-mute transition hover:border-navy/40 hover:text-navy disabled:opacity-60"
                  aria-label="Upload new photo"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[9px] font-semibold">
                    {uploading ? '…' : 'Upload'}
                  </span>
                </button>
              </div>

              {error ? (
                <p className="mt-1.5 text-[11px] text-spark">{error}</p>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {!open && error ? (
        <span className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap text-[11px] text-spark">
          {error}
        </span>
      ) : null}
    </div>
  )
}
