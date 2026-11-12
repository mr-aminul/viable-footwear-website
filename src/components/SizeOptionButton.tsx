'use client'

/**
 * Size chip for the product page (and admin PDP preview).
 * Out-of-stock sizes stay visible — grayed with a diagonal slash — so shoppers
 * see the full size run even when a size has zero stock.
 * Pre-order sizes are selectable without the slash.
 */
export function SizeOptionButton({
  label,
  available,
  preorder = false,
  selected = false,
  onSelect,
}: {
  label: string
  available: boolean
  /** Sold out but bookable as a pre-order. */
  preorder?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const selectable = available || preorder
  const ariaLabel = !selectable
    ? `${label} — Unavailable`
    : preorder
      ? `${label} — Pre-order`
      : label

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => {
        if (!selectable) return
        onSelect?.()
      }}
      className={`group relative inline-flex min-w-12 flex-col items-center justify-center overflow-hidden rounded-lg border px-3 transition ${
        !selectable
          ? 'cursor-not-allowed border-cloud bg-mist py-2.5 text-mute'
          : selected
            ? 'border-navy bg-navy py-2 text-white'
            : preorder
              ? 'border-dashed border-navy/45 bg-navy/[0.03] py-1.5 text-ink hover:border-navy/70'
              : 'border-cloud bg-white py-2.5 text-ink hover:border-navy/40'
      }`}
      aria-pressed={selectable ? selected : undefined}
      aria-disabled={!selectable}
      aria-label={ariaLabel}
      title={!selectable ? 'Unavailable' : preorder ? 'Pre-order' : undefined}
    >
      <span className="relative z-[1] text-[13px] font-medium">{label}</span>
      {selectable && preorder ? (
        <span
          className={`relative z-[1] text-[9px] font-semibold uppercase tracking-wide ${
            selected ? 'text-white/80' : 'text-navy'
          }`}
        >
          Pre-order
        </span>
      ) : null}
      {!selectable ? (
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
