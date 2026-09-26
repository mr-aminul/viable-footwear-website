'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { prepareMediaFileForUpload } from '@/lib/catalog/compress-image-client'
import { uploadSiteMedia } from '@/lib/website/actions'
import type { SitePageKey } from '@/lib/website/constants'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'

type SiteMediaPickerProps = {
  pageKey: SitePageKey
  value: string
  onChange: (path: string) => void
  accept?: 'image' | 'video' | 'both'
  label?: string
  aspectClassName?: string
  fallback?: string
  /** Extra classes on the outer frame (e.g. rounded corners when not clipped by a parent). */
  className?: string
}

/**
 * Media replace control that fills its parent layout — used for WYSIWYG website editing.
 * Replace button appears only on hover so the image reads like the storefront.
 */
export function SiteMediaPicker({
  pageKey,
  value,
  onChange,
  accept = 'image',
  label = 'Replace',
  aspectClassName = 'aspect-video',
  fallback = '/images/hero.png',
  className = '',
}: SiteMediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const acceptAttr =
    accept === 'video'
      ? 'video/mp4,video/webm'
      : accept === 'both'
        ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
        : 'image/jpeg,image/png,image/webp,image/gif'

  const url = resolveSiteMediaUrl(value, fallback)
  const isVideo =
    accept === 'video' ||
    /\.(mp4|webm)(\?|$)/i.test(value) ||
    value.includes('video')

  const onPick = (file: File | undefined) => {
    if (!file) return
    setError(null)
    startTransition(async () => {
      try {
        const prepared = await prepareMediaFileForUpload(file)
        const formData = new FormData()
        formData.set('file', prepared.file)
        const result = await uploadSiteMedia(pageKey, formData)
        if (!result.ok) {
          setError(result.error)
          return
        }
        onChange(result.data!.path)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      }
    })
  }

  return (
    <div
      className={['group/media relative overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={`relative ${aspectClassName} w-full`}>
        {isVideo && value ? (
          <video
            src={url}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
        ) : (
          <img src={url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 opacity-0 transition-opacity duration-200 group-hover/media:pointer-events-auto group-hover/media:opacity-100 group-focus-within/media:pointer-events-auto group-focus-within/media:opacity-100">
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-ink shadow-soft transition hover:bg-white disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {pending ? 'Uploading…' : label}
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error ? (
        <p className="absolute bottom-12 left-3 right-3 z-10 rounded-lg bg-white/95 px-3 py-2 text-[12px] font-medium text-spark shadow-soft">
          {error}
        </p>
      ) : null}
    </div>
  )
}
