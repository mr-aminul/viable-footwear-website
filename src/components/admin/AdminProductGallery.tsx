'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ImagePlus, Trash2, Upload } from 'lucide-react'
import {
  deleteProductMedia,
  reorderProductMedia,
  updateMediaColor,
  uploadProductMedia,
} from '@/lib/catalog/actions/media'
import {
  PRODUCT_BADGE_OPTIONS,
  normalizeProductBadge,
  productBadgeClassName,
} from '@/lib/catalog/badge'
import type { ProductBadge } from '@/lib/catalog/constants'
import { normalizeColorHex } from '@/lib/catalog/gallery'
import { resolveMediaUrl } from '@/lib/catalog/media-url'
import { FormError } from '@/components/admin/ui'

export type GalleryMedia = {
  id: string
  media_type: 'image' | 'video'
  storage_path: string
  alt: string | null
  sort_order: number
  color_hex?: string | null
}

export type GalleryColorOption = {
  hex: string
  label: string
}

type GalleryImage = GalleryMedia & { url: string; colorHex: string | null }

type AdminProductGalleryProps = {
  productId: string
  productName: string
  badge?: string | null
  onBadgeChange?: (badge: ProductBadge) => void
  isDraft?: boolean
  media: GalleryMedia[]
  /** Colorways from variants — used to tag images. */
  colorOptions?: GalleryColorOption[]
  /** Fallback when no uploaded images exist yet. */
  placeholderSrc: string
}

const BADGE_OPTIONS = PRODUCT_BADGE_OPTIONS

/**
 * Storefront-style gallery with hover-to-upload and drag-to-reorder thumbnails.
 */
export function AdminProductGallery({
  productId,
  productName,
  badge,
  onBadgeChange,
  isDraft,
  media,
  colorOptions = [],
  placeholderSrc,
}: AdminProductGalleryProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const badgeMenuRef = useRef<HTMLDivElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [badgeOpen, setBadgeOpen] = useState(false)

  const sortedFromProps = useMemo(
    () =>
      [...media]
        .filter((m) => m.media_type === 'image')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((m) => ({
          ...m,
          url: resolveMediaUrl(m.storage_path, 'image'),
          colorHex: normalizeColorHex(m.color_hex),
        })),
    [media],
  )

  const [images, setImages] = useState<GalleryImage[]>(sortedFromProps)

  useEffect(() => {
    setImages(sortedFromProps)
  }, [sortedFromProps])

  useEffect(() => {
    if (!badgeOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!badgeMenuRef.current?.contains(event.target as Node)) {
        setBadgeOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBadgeOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [badgeOpen])

  const video = useMemo(() => {
    const row = media.find((m) => m.media_type === 'video')
    if (!row) return null
    return {
      ...row,
      url: resolveMediaUrl(row.storage_path, 'video'),
    }
  }, [media])

  const selectedIndex = Math.max(
    0,
    images.findIndex((img) => img.id === selectedId),
  )
  const current =
    images.length > 0
      ? images[selectedIndex] ?? images[0]
      : { id: '', url: placeholderSrc, alt: productName }
  const currentIsReal = Boolean(current?.id)

  const persistOrder = (next: GalleryImage[]) => {
    setImages(next)
    setError(null)
    startTransition(async () => {
      const result = await reorderProductMedia(
        productId,
        next.map((img) => img.id),
      )
      if (!result.ok) {
        setError(result.error)
        setImages(sortedFromProps)
        return
      }
      router.refresh()
    })
  }

  const moveImage = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const from = images.findIndex((img) => img.id === fromId)
    const to = images.findIndex((img) => img.id === toId)
    if (from < 0 || to < 0) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    persistOrder(next)
  }

  const onDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    if (images.length < 2) return
    setDragId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  const onDragOver = (event: DragEvent<HTMLElement>, id: string) => {
    if (!dragId || dragId === id) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(id)
  }

  const onDrop = (event: DragEvent<HTMLElement>, id: string) => {
    event.preventDefault()
    const fromId = event.dataTransfer.getData('text/plain') || dragId
    setDragId(null)
    setDropTargetId(null)
    if (!fromId) return
    moveImage(fromId, id)
  }

  const onDragEnd = () => {
    setDragId(null)
    setDropTargetId(null)
  }

  const runUpload = (file: File) => {
    setError(null)
    const formData = new FormData()
    formData.set('file', file)
    startTransition(async () => {
      const result = await uploadProductMedia(productId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    runUpload(file)
  }

  const removeMedia = (id: string) => {
    if (!id) return
    setError(null)
    startTransition(async () => {
      const result = await deleteProductMedia(id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (selectedId === id) setSelectedId(null)
      router.refresh()
    })
  }

  const setImageColor = (id: string, colorHex: string | null) => {
    setError(null)
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, colorHex, color_hex: colorHex }
          : img,
      ),
    )
    startTransition(async () => {
      const result = await updateMediaColor(id, colorHex)
      if (!result.ok) {
        setError(result.error)
        setImages(sortedFromProps)
        return
      }
      router.refresh()
    })
  }

  const selectedImage =
    images.find((img) => img.id === (selectedId ?? images[0]?.id)) ?? null

  return (
    <div className="space-y-3">
      <FormError message={error} />

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        className="sr-only"
        onChange={onFileChange}
      />

      <div className="relative">
        <div className="group relative aspect-square overflow-hidden rounded-[1.5rem] bg-white">
          <img
            src={current?.url ?? placeholderSrc}
            alt={current?.alt || productName}
            className="h-full w-full object-contain"
          />

          {isDraft ? (
            <span className="absolute right-4 top-4 z-10 rounded-md bg-ink/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
              Draft
            </span>
          ) : null}

          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-ink/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-ink shadow-card transition hover:bg-mist disabled:opacity-60"
            >
              {pending ? (
                'Uploading…'
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </button>
            {currentIsReal ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => removeMedia(current.id)}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-[13px] font-semibold text-spark shadow-card transition hover:bg-white disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>
        </div>

        {onBadgeChange ? (
          <div ref={badgeMenuRef} className="absolute left-4 top-4 z-30">
            {(() => {
              const activeBadge = normalizeProductBadge(badge)
              return (
                <>
                  <div
                    className={`inline-flex items-stretch overflow-hidden rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${productBadgeClassName(activeBadge)}`}
                  >
                    <span className="px-2.5 py-1">{activeBadge}</span>
                    <button
                      type="button"
                      aria-label="Choose badge"
                      aria-expanded={badgeOpen}
                      aria-haspopup="listbox"
                      onClick={() => setBadgeOpen((open) => !open)}
                      className="border-l border-white/25 px-1.5 transition hover:bg-white/10"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition ${badgeOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {badgeOpen ? (
                    <div
                      role="listbox"
                      aria-label="Badge options"
                      className="absolute left-0 top-full z-40 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl bg-white py-1 shadow-lift ring-1 ring-cloud"
                    >
                      {BADGE_OPTIONS.map((option) => {
                        const selected = activeBadge === option
                        return (
                          <button
                            key={option}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              onBadgeChange(option)
                              setBadgeOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-mist ${
                              selected
                                ? 'font-semibold text-navy'
                                : 'font-medium text-ink'
                            }`}
                          >
                            <span
                              className={`inline-flex min-w-16 justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${productBadgeClassName(option)}`}
                            >
                              {option}
                            </span>
                            {selected ? (
                              <span className="ml-auto text-[11px] text-navy">
                                Selected
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        ) : (
          <span
            className={`absolute left-4 top-4 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${productBadgeClassName(normalizeProductBadge(badge))}`}
          >
            {normalizeProductBadge(badge)}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => {
          const isSelected = selectedId ? selectedId === img.id : i === 0
          const isDragging = dragId === img.id
          const isDropTarget = dropTargetId === img.id && dragId !== img.id

          return (
            <div
              key={img.id}
              role="button"
              tabIndex={0}
              draggable={images.length > 1 && !pending}
              onDragStart={(e) => onDragStart(e, img.id)}
              onDragOver={(e) => onDragOver(e, img.id)}
              onDrop={(e) => onDrop(e, img.id)}
              onDragEnd={onDragEnd}
              onClick={() => setSelectedId(img.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedId(img.id)
                }
              }}
              aria-label={`Select image ${i + 1}${images.length > 1 ? ', drag to reorder' : ''}`}
              className={[
                'group/thumb relative h-16 w-16 shrink-0 rounded-xl border bg-white transition',
                images.length > 1
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-pointer',
                isSelected ? 'border-navy' : 'border-cloud',
                isDragging ? 'opacity-40' : '',
                isDropTarget ? 'border-navy ring-2 ring-navy/30' : '',
              ].join(' ')}
            >
              <div className="h-full w-full overflow-hidden rounded-[inherit]">
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none h-full w-full object-contain"
                />
              </div>
              {img.colorHex ? (
                <span
                  aria-hidden
                  title={`Color ${img.colorHex}`}
                  className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: img.colorHex }}
                />
              ) : null}
              <button
                type="button"
                disabled={pending}
                aria-label="Remove image"
                onClick={(e) => {
                  e.stopPropagation()
                  removeMedia(img.id)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white opacity-0 transition group-hover/thumb:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-cloud bg-white text-mute transition hover:border-navy/40 hover:text-navy disabled:opacity-60"
          aria-label="Add media"
        >
          <ImagePlus className="h-4 w-4" />
          <span className="text-[10px] font-semibold">Add</span>
        </button>
      </div>

      {selectedImage && colorOptions.length > 0 ? (
        <label className="flex flex-wrap items-center gap-2 text-[12px] text-mute">
          <span className="font-medium text-ink">Color for selected image</span>
          <select
            value={selectedImage.colorHex ?? ''}
            disabled={pending}
            onChange={(e) =>
              setImageColor(selectedImage.id, e.target.value || null)
            }
            className="rounded-lg border border-cloud bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink outline-none transition focus:border-navy/40"
          >
            <option value="">All colors (shared)</option>
            {colorOptions.map((option) => (
              <option key={option.hex} value={option.hex}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {images.length > 1 ? (
        <p className="text-[12px] text-mute">
          Drag thumbnails to set gallery order. First image is primary.
          {colorOptions.length > 0
            ? ' Tag an image with a color so the storefront gallery switches with the swatch.'
            : ''}
        </p>
      ) : null}

      {video ? (
        <div className="group/video relative overflow-hidden rounded-[1.25rem]">
          <video controls className="w-full bg-ink/5" src={video.url} />
          <button
            type="button"
            disabled={pending}
            onClick={() => removeMedia(video.id)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-spark opacity-0 shadow-sm transition group-hover/video:opacity-100 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove video
          </button>
        </div>
      ) : null}
    </div>
  )
}
