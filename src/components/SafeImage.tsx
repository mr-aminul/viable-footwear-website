'use client'

import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'
import { withMediaWidth } from '@/lib/media/storage-proxy'
import type { MediaWidth } from '@/lib/media/resize'

/** Soft storefront placeholder when product/site media fails to load. */
export const MEDIA_PLACEHOLDER = '/images/media-placeholder.svg'

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined
  /**
   * Longest edge for CDN-resized `/api/media/…?w=` delivery.
   * Use small values for thumbs/swatches, mid for cards, omit for hero/PDP.
   */
  maxWidth?: MediaWidth
}

/**
 * Renders an image and swaps to a local placeholder if the URL 404s / 402s /
 * otherwise fails — avoids the browser broken-image icon on cards and thumbs.
 */
export function SafeImage({
  src,
  alt = '',
  maxWidth,
  onError,
  loading,
  decoding = 'async',
  ...rest
}: SafeImageProps) {
  const resolved = withMediaWidth(src || MEDIA_PLACEHOLDER, maxWidth)
  const [current, setCurrent] = useState(resolved)

  useEffect(() => {
    setCurrent(withMediaWidth(src || MEDIA_PLACEHOLDER, maxWidth))
  }, [src, maxWidth])

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event)
    if (current !== MEDIA_PLACEHOLDER) {
      setCurrent(MEDIA_PLACEHOLDER)
    }
  }

  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={handleError}
    />
  )
}
