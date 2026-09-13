'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import {
  PRODUCT_BADGE_OPTIONS,
  normalizeProductBadge,
  productBadgeClassName,
} from '@/lib/catalog/badge'
import type { ProductBadge } from '@/lib/catalog/constants'

type BadgePickerProps = {
  value: string | null | undefined
  onChange: (badge: ProductBadge) => void
  /** Compact trigger for tight table cells. */
  compact?: boolean
  /** Render menu in a portal so overflow:hidden parents don't clip it. */
  portal?: boolean
  className?: string
  'aria-label'?: string
  onFocus?: () => void
  onKeyDown?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  buttonRef?: (node: HTMLButtonElement | null) => void
}

/**
 * Colored badge pill + custom menu — same control as the product edit gallery.
 */
export function BadgePicker({
  value,
  onChange,
  compact = false,
  portal = false,
  className = '',
  'aria-label': ariaLabel = 'Choose badge',
  onFocus,
  onKeyDown,
  buttonRef,
}: BadgePickerProps) {
  const activeBadge = normalizeProductBadge(value)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  useEffect(() => {
    if (!open) return

    const syncPosition = () => {
      const trigger = rootRef.current
      if (!trigger || !portal) return
      const rect = trigger.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: 80,
      })
    }

    syncPosition()

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDownEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDownEscape)
    window.addEventListener('scroll', syncPosition, true)
    window.addEventListener('resize', syncPosition)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDownEscape)
      window.removeEventListener('scroll', syncPosition, true)
      window.removeEventListener('resize', syncPosition)
    }
  }, [open, portal])

  const menu = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-label="Badge options"
      style={portal ? (menuStyle ?? undefined) : undefined}
      className={[
        'min-w-[10.5rem] overflow-hidden rounded-xl bg-white py-1 shadow-lift ring-1 ring-cloud',
        portal ? '' : 'absolute left-0 top-full z-40 mt-1.5',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {PRODUCT_BADGE_OPTIONS.map((option) => {
        const selected = activeBadge === option
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              onChange(option)
              setOpen(false)
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-mist ${
              selected ? 'font-semibold text-navy' : 'font-medium text-ink'
            }`}
          >
            <span
              className={`inline-flex min-w-16 justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${productBadgeClassName(option)}`}
            >
              {option}
            </span>
            {selected ? (
              <span className="ml-auto text-[11px] text-navy">Selected</span>
            ) : null}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <div
        className={`inline-flex items-stretch overflow-hidden rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${productBadgeClassName(activeBadge)}`}
      >
        <span className={compact ? 'px-2 py-1' : 'px-2.5 py-1'}>
          {activeBadge}
        </span>
        <button
          ref={buttonRef}
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onClick={() => setOpen((current) => !current)}
          className="border-l border-white/25 px-1.5 transition hover:bg-white/10"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {portal && typeof document !== 'undefined'
        ? createPortal(menu, document.body)
        : menu}
    </div>
  )
}
