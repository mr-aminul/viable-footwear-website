'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteProductMedia,
  reorderProductMedia,
  updateMediaAlt,
  uploadProductMedia,
} from '@/lib/catalog/actions/media'
import { resolveMediaUrl } from '@/lib/catalog/media-url'
import {
  AdminButton,
  FormError,
  FormSuccess,
  inputClassName,
} from '@/components/admin/ui'

export type MediaDraft = {
  id: string
  media_type: 'image' | 'video'
  storage_path: string
  alt: string | null
  sort_order: number
}

export function ProductMediaManager({
  productId,
  initial,
}: {
  productId: string
  initial: MediaDraft[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((m) => [m.id, m.alt ?? ''])),
  )

  const images = useMemo(
    () =>
      [...initial]
        .filter((m) => m.media_type === 'image')
        .sort((a, b) => a.sort_order - b.sort_order),
    [initial],
  )
  const video = initial.find((m) => m.media_type === 'video')

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(okMsg)
      router.refresh()
    })
  }

  const onUpload = (formData: FormData) => {
    run(() => uploadProductMedia(productId, formData), 'Media uploaded.')
  }

  const move = (id: string, direction: -1 | 1) => {
    const ids = images.map((m) => m.id)
    const index = ids.indexOf(id)
    const next = index + direction
    if (index < 0 || next < 0 || next >= ids.length) return
    const reordered = [...ids]
    const [item] = reordered.splice(index, 1)
    reordered.splice(next, 0, item)
    run(() => reorderProductMedia(productId, reordered), 'Gallery order updated.')
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={success} />

      <form action={onUpload} className="rounded-2xl border border-cloud bg-white p-5">
        <p className="text-[13px] font-semibold text-ink">Upload</p>
        <p className="mt-1 text-[12px] text-mute">
          Images up to 8MB (JPEG/PNG/WebP/GIF). One optional video up to 50MB (MP4/WebM).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            required
            className="text-[13px]"
          />
          <input
            name="alt"
            placeholder="Alt text"
            className={`${inputClassName} sm:max-w-xs`}
          />
          <AdminButton type="submit" disabled={pending}>
            {pending ? 'Uploading…' : 'Upload'}
          </AdminButton>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((media, index) => {
          const url = resolveMediaUrl(media.storage_path, 'image')
          return (
            <div
              key={media.id}
              className="overflow-hidden rounded-2xl border border-cloud bg-white"
            >
              <div className="aspect-square bg-mist/40">
                <img
                  src={url}
                  alt={media.alt ?? ''}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-2 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {index === 0 ? 'Primary' : `Image ${index + 1}`}
                </p>
                <input
                  value={altDrafts[media.id] ?? ''}
                  onChange={(e) =>
                    setAltDrafts((prev) => ({
                      ...prev,
                      [media.id]: e.target.value,
                    }))
                  }
                  className={inputClassName}
                  placeholder="Alt text"
                />
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          updateMediaAlt(media.id, altDrafts[media.id] ?? ''),
                        'Alt text saved.',
                      )
                    }
                  >
                    Save alt
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    disabled={pending || index === 0}
                    onClick={() => move(media.id, -1)}
                  >
                    ↑
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    disabled={pending || index === images.length - 1}
                    onClick={() => move(media.id, 1)}
                  >
                    ↓
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="danger"
                    disabled={pending}
                    onClick={() =>
                      run(() => deleteProductMedia(media.id), 'Media deleted.')
                    }
                  >
                    Delete
                  </AdminButton>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {video ? (
        <div className="rounded-2xl border border-cloud bg-white p-4">
          <p className="text-[13px] font-semibold text-ink">Product video</p>
          <video
            controls
            className="mt-3 max-h-64 w-full rounded-xl bg-ink/5"
            src={resolveMediaUrl(video.storage_path, 'video')}
          />
          <div className="mt-3">
            <AdminButton
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(() => deleteProductMedia(video.id), 'Video deleted.')
              }
            >
              Delete video
            </AdminButton>
          </div>
        </div>
      ) : null}

      {images.length === 0 && !video ? (
        <p className="text-[14px] text-mute">No media yet.</p>
      ) : null}
    </div>
  )
}
