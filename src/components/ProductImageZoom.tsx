'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn } from 'lucide-react'

/**
 * Product image with a subtle hover pop and a click/tap lightbox
 * for a closer look on any device.
 */
export function ProductImageZoom({
  src,
  alt,
  children,
}: {
  src: string
  alt: string
  children?: ReactNode
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [canHoverPop, setCanHoverPop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setCanHoverPop(mq.matches && !reduce.matches)
    sync()
    mq.addEventListener('change', sync)
    reduce.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      reduce.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    setLightboxOpen(false)
  }, [src])

  useEffect(() => {
    if (!lightboxOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [lightboxOpen])

  return (
    <>
      <button
        type="button"
        aria-label={`View larger image of ${alt}`}
        className={[
          'group/zoom relative h-full w-full cursor-zoom-in overflow-hidden',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-inset',
        ].join(' ')}
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={[
            'pointer-events-none absolute inset-0 h-full w-full object-contain select-none',
            'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            canHoverPop ? 'group-hover/zoom:scale-[1.04]' : '',
          ].join(' ')}
        />

        {children}

        <span className="pointer-events-none absolute right-3 bottom-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition group-hover/zoom:opacity-100">
          <ZoomIn className="h-3.5 w-3.5" />
          {canHoverPop ? 'Click to enlarge' : 'Tap to enlarge'}
        </span>
      </button>

      {lightboxOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${alt} — enlarged view`}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm md:p-8"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                type="button"
                aria-label="Close enlarged image"
                className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition hover:bg-white"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={src}
                alt={alt}
                className="max-h-full max-w-full object-contain"
                draggable={false}
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
