'use client'

import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'
import { MEDIA_FALLBACK } from '@/lib/catalog/media-url'
import { withMediaWidth } from '@/lib/media/storage-proxy'
import type { MediaWidth } from '@/lib/media/widths'

/** Soft storefront placeholder when product/site media fails to load. */
export const MEDIA_PLACEHOLDER = '/images/media-placeholder.svg'

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined
  /**
   * Longest edge for pre-built storage variants (`….w{N}.webp`).
   * Use small values for thumbs/swatches, mid for cards, omit for hero/PDP.
   */
  maxWidth?: MediaWidth
}

function isBrandFallbackSrc(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return path === MEDIA_FALLBACK || path.endsWith('/favicon.png')
}

/**
 * Brand logo fallback should sit small and centered — not fill the tile
 * like a product photo (`object-cover`).
 */
function withBrandFallbackClass(
  className: string | undefined,
  isBrandFallback: boolean,
): string | undefined {
  if (!isBrandFallback) return className
  const base = (className ?? '')
    .replace(/\bobject-cover\b/g, 'object-contain')
    .trim()
  return [base, 'object-contain p-[34%]'].filter(Boolean).join(' ')
}

/**
 * Renders an image and swaps to a local placeholder if the URL 404s / 402s /
 * otherwise fails — avoids the browser broken-image icon on cards and thumbs.
 * Width-variant misses fall back to the original object before the placeholder
 * (older uploads may not have `….w{N}.webp` siblings yet).
 */
export function SafeImage({
  src,
  alt = '',
  maxWidth,
  onError,
  loading,
  decoding = 'async',
  className,
  ...rest
}: SafeImageProps) {
  const base = src || MEDIA_PLACEHOLDER
  const preferred = withMediaWidth(base, maxWidth)
  const [current, setCurrent] = useState(preferred)

  useEffect(() => {
    setCurrent(withMediaWidth(src || MEDIA_PLACEHOLDER, maxWidth))
  }, [src, maxWidth])

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event)
    const original = src || MEDIA_PLACEHOLDER
    if (current !== original && original !== MEDIA_PLACEHOLDER) {
      // Variant missing — try the master object next.
      setCurrent(original)
      return
    }
    if (current !== MEDIA_PLACEHOLDER) {
      setCurrent(MEDIA_PLACEHOLDER)
    }
  }

  const isBrandFallback = isBrandFallbackSrc(current)

  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={withBrandFallbackClass(className, isBrandFallback)}
      onError={handleError}
    />
  )
}
