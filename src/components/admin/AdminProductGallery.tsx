'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { Reorder, useMotionValue, useReducedMotion } from 'framer-motion'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import {
  deleteProductMedia,
  reorderProductMedia,
  updateMediaColorway,
  uploadProductMedia,
} from '@/lib/catalog/actions/media'
import { colorwayKey } from '@/lib/catalog/colorway'
import { prepareMediaFileForUpload } from '@/lib/catalog/compress-image-client'
import { normalizeProductBadge, productBadgeClassName } from '@/lib/catalog/badge'
import type { ProductBadge } from '@/lib/catalog/constants'
import { resolveMediaUrl } from '@/lib/catalog/media-url'
import { BadgePicker } from '@/components/admin/BadgePicker'
import { FormError } from '@/components/admin/ui'

export type GalleryMedia = {
  id: string
  media_type: 'image' | 'video'
  storage_path: string
  alt: string | null
  sort_order: number
  color?: string | null
  color_hex?: string | null
}

type GalleryImage = GalleryMedia & { url: string }

type AdminProductGalleryProps = {
  productId: string
  productName: string
  badge?: string | null
  onBadgeChange?: (badge: ProductBadge) => void
  isDraft?: boolean
  media: GalleryMedia[]
  /** Colorway names from variants — used to tag gallery images. */
  colorways?: string[]
  /** When set, left thumbs filter to this colorway (storefront preview). */
  previewColorKey?: string | null
  /** Fallback when no uploaded images exist yet. */
  placeholderSrc: string
}

function sameOrder(a: GalleryImage[], b: GalleryImage[]) {
  if (a.length !== b.length) return false
  return a.every((image, index) => image.id === b[index]?.id)
}

function GalleryThumb({
  image,
  index,
  isSelected,
  canDrag,
  pending,
  colorways,
  onSelect,
  onRemove,
  onColorChange,
  onDragStart,
  onDragEnd,
}: {
  image: GalleryImage
  index: number
  isSelected: boolean
  canDrag: boolean
  pending: boolean
  colorways: string[]
  onSelect: () => void
  onRemove: () => void
  onColorChange: (color: string | null) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const reduceMotion = useReducedMotion()
  const y = useMotionValue(0)

  return (
    <Reorder.Item
      value={image}
      as="div"
      drag={canDrag}
      onDragStart={onDragStart}
      onDragEnd={() => {
        y.set(0)
        onDragEnd()
      }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Select image ${index + 1}${canDrag ? ', drag to reorder' : ''}`}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }
      }
      // Lock cross-axis so leftover drag translateY can't misalign thumbs.
      style={{ y }}
      whileDrag={{
        scale: 1.08,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
        zIndex: 20,
        cursor: 'grabbing',
      }}
      className={[
        'group/thumb relative aspect-square w-full shrink-0 rounded-xl border bg-white outline-none',
        canDrag ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer',
        isSelected ? 'border-navy' : 'border-cloud',
      ].join(' ')}
    >
      <div className="h-full w-full overflow-hidden rounded-[inherit]">
        <img
          src={image.url}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-contain"
        />
      </div>
      <button
        type="button"
        disabled={pending}
        aria-label="Remove image"
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white opacity-0 transition group-hover/thumb:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      {colorways.length > 0 ? (
        <select
          aria-label={`Colorway for image ${index + 1}`}
          disabled={pending}
          value={image.color?.trim() || ''}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onColorChange(event.target.value || null)
          }}
          className="absolute inset-x-0 bottom-0 z-10 max-w-full truncate rounded-b-[inherit] border-0 bg-ink/80 py-0.5 pl-0.5 pr-0 text-[8px] font-semibold uppercase tracking-wide text-white"
        >
          <option value="">Shared</option>
          {colorways.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : image.color?.trim() ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-ink/75 px-0.5 py-px text-center text-[8px] font-semibold uppercase tracking-wide text-white">
          {image.color.trim()}
        </span>
      ) : null}
    </Reorder.Item>
  )
}

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
  colorways = [],
  previewColorKey = null,
  placeholderSrc,
}: AdminProductGalleryProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sortedFromProps = useMemo(
    () =>
      [...media]
        .filter((m) => m.media_type === 'image')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((m) => ({
          ...m,
          url: resolveMediaUrl(m.storage_path, 'image'),
        })),
    [media],
  )

  const displayImages = useMemo(() => {
    if (!previewColorKey) return sortedFromProps
    const tagged = sortedFromProps.filter(
      (img) =>
        Boolean(img.color?.trim()) &&
        colorwayKey(img.color) === previewColorKey,
    )
    if (tagged.length > 0) return tagged
    const otherUrls = new Set(
      sortedFromProps
        .filter(
          (img) =>
            Boolean(img.color?.trim()) &&
            colorwayKey(img.color) !== previewColorKey,
        )
        .map((img) => img.url),
    )
    const shared = sortedFromProps.filter((img) => !otherUrls.has(img.url))
    return shared.length > 0 ? shared : sortedFromProps
  }, [previewColorKey, sortedFromProps])

  const [images, setImages] = useState<GalleryImage[]>(displayImages)
  const orderBeforeDragRef = useRef(displayImages)
  const imagesRef = useRef(images)
  const filteringByColor = Boolean(previewColorKey)

  useEffect(() => {
    setImages(displayImages)
    setSelectedId((current) => {
      if (current && displayImages.some((img) => img.id === current)) {
        return current
      }
      return displayImages[0]?.id ?? null
    })
  }, [displayImages])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

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
  const canDrag = images.length > 1 && !pending && !filteringByColor

  const persistOrder = (next: GalleryImage[]) => {
    setError(null)
    startTransition(async () => {
      // When not filtering, next is the full ordered list.
      const result = await reorderProductMedia(
        productId,
        next.map((img) => img.id),
      )
      if (!result.ok) {
        setError(result.error)
        setImages(orderBeforeDragRef.current)
        return
      }
      router.refresh()
    })
  }

  const setImageColor = (mediaId: string, color: string | null) => {
    setError(null)
    startTransition(async () => {
      const result = await updateMediaColorway(mediaId, color)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const runUpload = (files: File[]) => {
    if (files.length === 0) return
    setError(null)
    startTransition(async () => {
      const activeColor =
        colorways.find((name) => colorwayKey(name) === previewColorKey) ?? null
      let lastError: string | null = null
      for (const file of files) {
        const prepared = await prepareMediaFileForUpload(file)
        const formData = new FormData()
        formData.set('file', prepared.file)
        if (activeColor) formData.set('color', activeColor)
        const result = await uploadProductMedia(productId, formData)
        if (!result.ok) {
          lastError = result.error
          break
        }
      }
      if (lastError) setError(lastError)
      router.refresh()
    })
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    runUpload(files)
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

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <p className="text-[12px] leading-relaxed text-mute">
        Images are auto-compressed to WebP (~400KB). Videos max 12MB — compress
        externally if needed.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        multiple
        className="sr-only"
        onChange={onFileChange}
      />

      <div className="flex gap-3">
        <div className="flex w-16 shrink-0 flex-col gap-2">
          <Reorder.Group
            axis="y"
            values={images}
            onReorder={(next) => {
              imagesRef.current = next
              setImages(next)
            }}
            as="div"
            className="flex max-h-[min(100vw-2rem,36rem)] flex-col gap-2 overflow-y-auto"
          >
              {images.map((img, i) => {
                const isSelected = selectedId ? selectedId === img.id : i === 0
                return (
                  <GalleryThumb
                    key={img.id}
                    image={img}
                    index={i}
                    isSelected={isSelected}
                    canDrag={canDrag}
                    pending={pending}
                    colorways={colorways}
                    onSelect={() => setSelectedId(img.id)}
                    onRemove={() => removeMedia(img.id)}
                    onColorChange={(color) => setImageColor(img.id, color)}
                    onDragStart={() => {
                      orderBeforeDragRef.current = imagesRef.current
                    }}
                    onDragEnd={() => {
                      const next = imagesRef.current
                      if (!sameOrder(next, orderBeforeDragRef.current)) {
                        persistOrder(next)
                      }
                    }}
                  />
                )
              })}
            </Reorder.Group>

            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square w-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-cloud bg-white text-mute transition hover:border-navy/40 hover:text-navy disabled:opacity-60"
              aria-label="Add media"
            >
              <ImagePlus className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Add</span>
            </button>
          </div>

        <div className="relative min-w-0 flex-1">
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
            <div className="absolute left-4 top-4 z-30">
              <BadgePicker value={badge} onChange={onBadgeChange} />
            </div>
          ) : (
            <span
              className={`absolute left-4 top-4 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${productBadgeClassName(normalizeProductBadge(badge))}`}
            >
              {normalizeProductBadge(badge)}
            </span>
          )}
        </div>
      </div>

      <p className="text-[12px] text-mute">
        Tag each photo with a colorway (hover thumbnail → dropdown). The
        storefront gallery shows only the selected color’s photos. Sizes share
        that color’s images — no re-upload per size.
        {!filteringByColor && images.length > 1
          ? ' Drag thumbnails to set order.'
          : null}
      </p>

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
