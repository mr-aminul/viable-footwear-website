'use client'

/**
 * Size chip for the product page (and admin PDP preview).
 * Out-of-stock sizes stay visible — grayed with a diagonal slash — so shoppers
 * see the full size run even when a size has zero stock.
 */
export function SizeOptionButton({
  label,
  available,
  selected = false,
  onSelect,
}: {
  label: string
  available: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => {
        if (!available) return
        onSelect?.()
      }}
      className={`group relative inline-flex min-w-12 items-center justify-center overflow-hidden rounded-lg border px-3 py-2.5 text-[13px] font-medium transition ${
        !available
          ? 'cursor-not-allowed border-cloud bg-mist text-mute'
          : selected
            ? 'border-navy bg-navy text-white'
            : 'border-cloud bg-white text-ink hover:border-navy/40'
      }`}
      aria-pressed={available ? selected : undefined}
      aria-disabled={!available}
      aria-label={available ? label : `${label} — Unavailable`}
      title={available ? undefined : 'Unavailable'}
    >
      <span className="relative z-[1]">{label}</span>
      {!available ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-px w-[145%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg] bg-cloud"
          />
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            Unavailable
          </span>
        </>
      ) : null}
    </button>
  )
}
