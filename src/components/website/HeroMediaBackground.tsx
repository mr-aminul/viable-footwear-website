'use client'

import { useEffect, useState } from 'react'
import type { HeroMediaMode, HeroSlide } from '@/lib/website/types'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'

type HeroMediaBackgroundProps = {
  mode: HeroMediaMode
  image: string
  video: string
  slides: HeroSlide[]
  slideIntervalMs: number
  className?: string
}

/**
 * Full-bleed hero media: single image, looping video, or auto-advancing slideshow.
 */
export function HeroMediaBackground({
  mode,
  image,
  video,
  slides,
  slideIntervalMs,
  className = 'absolute inset-0',
}: HeroMediaBackgroundProps) {
  const validSlides = slides.filter((s) => s.src)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    if (mode !== 'slideshow' || validSlides.length <= 1) return
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % validSlides.length)
    }, Math.max(2000, slideIntervalMs))
    return () => window.clearInterval(id)
  }, [mode, validSlides.length, slideIntervalMs])

  useEffect(() => {
    setSlideIndex(0)
  }, [mode, validSlides.length])

  if (mode === 'video' && video) {
    const src = resolveSiteMediaUrl(video, '')
    return (
      <div className={className}>
        <video
          key={src}
          className="h-full w-full object-cover object-center"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      </div>
    )
  }

  if (mode === 'slideshow' && validSlides.length > 0) {
    return (
      <div className={className}>
        {validSlides.map((slide, i) => (
          <img
            key={slide.id}
            src={resolveSiteMediaUrl(slide.src)}
            alt={slide.alt || ''}
            className={[
              'absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700',
              i === slideIndex ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <img
        src={resolveSiteMediaUrl(image)}
        alt=""
        className="h-full w-full object-cover object-center"
      />
    </div>
  )
}
