'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Loads the Google Maps iframe only when the block is near the viewport,
 * so About page visitors who never scroll there pay nothing for Maps.
 */
export function LazyMapsEmbed({
  src,
  title = 'Viable store on Google Maps',
  className = 'h-[260px] w-full border-0 md:h-[360px]',
}: {
  src: string
  title?: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (!src) return
    const node = containerRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px', threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [src])

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl border border-cloud bg-mist/40"
    >
      {shouldLoad ? (
        <iframe
          title={title}
          src={src}
          className={className}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className={`${className} bg-mist/50`} aria-hidden />
      )}
    </div>
  )
}
