import { Link } from 'react-router-dom'

type BrandLogoProps = {
  className?: string
  /** `dark` = navy mark for light backgrounds; `light` = white mark for dark backgrounds */
  variant?: 'dark' | 'light'
  heightClassName?: string
}

/**
 * Site brand mark using the Viable wordmark image.
 */
export function BrandLogo({
  className = '',
  variant = 'dark',
  heightClassName = 'h-8 md:h-9',
}: BrandLogoProps) {
  const src = variant === 'light' ? '/logo.png' : '/logo-dark.png'

  return (
    <Link
      to="/"
      className={`inline-flex items-center ${className}`}
      aria-label="Viable home"
    >
      <img
        src={src}
        alt="Viable"
        className={`w-auto ${heightClassName}`}
        width={332}
        height={81}
        decoding="async"
      />
    </Link>
  )
}
