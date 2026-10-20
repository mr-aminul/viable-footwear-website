'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { SafeImage } from '@/components/SafeImage'
import type { HeroMediaMode, HeroSlide } from '@/lib/website/types'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'

type HeroMediaBackgroundProps = {
  mode: HeroMediaMode
  image: string
  video: string
  slides: HeroSlide[]
  slideIntervalMs: number
  className?: string
  /** Show mute/unmute control (storefront). Off in admin preview. */
  showSoundToggle?: boolean
}

/**
 * Hero video that tries to autoplay with sound. Browsers usually block that
 * until a user gesture — we fall back to muted playback, then unmute on the
 * first tap/click/keypress (or via the sound toggle).
 */
const VOLUME_FADE_MS = 2000

function HeroVideo({
  src,
  className,
  showSoundToggle,
}: {
  src: string
  className: string
  showSoundToggle: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fadeFrameRef = useRef<number | null>(null)
  const [isMuted, setIsMuted] = useState(true)

  const cancelVolumeFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current)
      fadeFrameRef.current = null
    }
  }, [])

  /** Ease volume from silence to full over ~2s so sound doesn't jump scare. */
  const fadeVolumeIn = useCallback(
    (el: HTMLVideoElement) => {
      cancelVolumeFade()
      el.volume = 0
      const startedAt = performance.now()

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / VOLUME_FADE_MS)
        // Ease-out so it feels gentle at the start.
        const eased = 1 - (1 - progress) ** 2
        el.volume = Math.min(1, eased)
        if (progress < 1) {
          fadeFrameRef.current = requestAnimationFrame(tick)
          return
        }
        fadeFrameRef.current = null
      }

      fadeFrameRef.current = requestAnimationFrame(tick)
    },
    [cancelVolumeFade],
  )

  const tryPlayWithSound = useCallback(async () => {
    const el = videoRef.current
    if (!el) return false

    el.muted = false
    el.volume = 0
    try {
      await el.play()
      setIsMuted(false)
      fadeVolumeIn(el)
      return true
    } catch {
      cancelVolumeFade()
      el.muted = true
      el.volume = 0
      setIsMuted(true)
      try {
        await el.play()
      } catch {
        // Autoplay fully blocked — user can tap the control.
      }
      return false
    }
  }, [cancelVolumeFade, fadeVolumeIn])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    // Admin / preview: keep muted looping video only.
    if (!showSoundToggle) {
      el.muted = true
      void el.play().catch(() => {})
      return
    }

    let cancelled = false
    let unlocked = false
    let removeListeners: (() => void) | undefined

    const unlockSound = () => {
      if (unlocked || cancelled) return
      unlocked = true
      void tryPlayWithSound()
      removeListeners?.()
    }

    const attachUnlockListeners = () => {
      // Scroll does not count as a user gesture for autoplay — click/tap/key does.
      window.addEventListener('pointerdown', unlockSound)
      window.addEventListener('keydown', unlockSound)
      window.addEventListener('touchend', unlockSound)
      removeListeners = () => {
        window.removeEventListener('pointerdown', unlockSound)
        window.removeEventListener('keydown', unlockSound)
        window.removeEventListener('touchend', unlockSound)
      }
    }

    void (async () => {
      const playedWithSound = await tryPlayWithSound()
      if (cancelled || playedWithSound) return
      attachUnlockListeners()
    })()

    return () => {
      cancelled = true
      cancelVolumeFade()
      removeListeners?.()
    }
  }, [cancelVolumeFade, src, showSoundToggle, tryPlayWithSound])

  const toggleSound = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const el = videoRef.current
    if (!el) return

    if (isMuted) {
      void tryPlayWithSound()
      return
    }

    cancelVolumeFade()
    el.muted = true
    el.volume = 0
    setIsMuted(true)
  }

  return (
    <>
      <div className={className}>
        <video
          ref={videoRef}
          key={src}
          className="h-full w-full object-cover object-center"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      </div>
      {showSoundToggle ? (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={isMuted ? 'Unmute hero video' : 'Mute hero video'}
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:top-5 md:right-8 lg:right-10"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      ) : null}
    </>
  )
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
  showSoundToggle = true,
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
      <HeroVideo
        src={src}
        className={className}
        showSoundToggle={showSoundToggle}
      />
    )
  }

  if (mode === 'slideshow' && validSlides.length > 0) {
    return (
      <div className={className}>
        {validSlides.map((slide, i) => (
          <SafeImage
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
      <SafeImage
        src={resolveSiteMediaUrl(image)}
        alt=""
        className="h-full w-full object-cover object-center"
      />
    </div>
  )
}
