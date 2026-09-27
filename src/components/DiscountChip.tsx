import { discountPercent } from '@/lib/brand'

type DiscountChipProps = {
  price: number
  compareAt: number | null | undefined
  className?: string
}

/** Compact “-% off” chip for price rows (cards, PDP, admin). */
export function DiscountChip({
  price,
  compareAt,
  className = '',
}: DiscountChipProps) {
  const percent = discountPercent(price, compareAt)
  if (percent == null || percent <= 0) return null

  return (
    <span
      className={`inline-flex items-center rounded-full bg-spark px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ${className}`}
    >
      −{percent}%
    </span>
  )
}
