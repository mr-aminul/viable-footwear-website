'use client'

import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'

/** Soft storefront placeholder when product/site media fails to load. */
export const MEDIA_PLACEHOLDER = '/images/media-placeholder.svg'

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined
}

/**
 * Renders an image and swaps to a local placeholder if the URL 404s / 402s /
 * otherwise fails — avoids the browser broken-image icon on cards and thumbs.
 */
export function SafeImage({
  src,
  alt = '',
  onError,
  ...rest
}: SafeImageProps) {
  const [current, setCurrent] = useState(src || MEDIA_PLACEHOLDER)

  useEffect(() => {
    setCurrent(src || MEDIA_PLACEHOLDER)
  }, [src])

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event)
    if (current !== MEDIA_PLACEHOLDER) {
      setCurrent(MEDIA_PLACEHOLDER)
    }
  }

  return <img {...rest} src={current} alt={alt} onError={handleError} />
}
