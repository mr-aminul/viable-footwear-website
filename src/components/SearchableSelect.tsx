'use client'

import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectHandle {
  focus: () => void
  scrollIntoView: (arg?: boolean | ScrollIntoViewOptions) => void
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  searchPlaceholder?: string
  emptyMessage?: string
  /** Tighter control for spreadsheet / admin tables. */
  compact?: boolean
  /** Render menu in a portal so overflow parents don't clip it. */
  portal?: boolean
  'aria-label'?: string
  ref?: Ref<SearchableSelectHandle | null>
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  required = false,
  invalid = false,
  className = '',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  compact = false,
  portal = false,
  'aria-label': ariaLabel,
  ref,
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useImperativeHandle(ref, () => ({
    focus: () => triggerRef.current?.focus(),
    scrollIntoView: (arg) => triggerRef.current?.scrollIntoView(arg),
  }))

  useLayoutEffect(() => {
    if (!open || !portal) {
      setMenuStyle(null)
      return
    }
    const place = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.max(rect.width, compact ? 180 : 220)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: Math.max(8, left),
        width,
        zIndex: 80,
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, portal, compact])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHighlightIndex(0)
    const t = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      const menu = document.getElementById(listId)
      if (menu?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, listId])

  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) =>
        filtered.length === 0 ? 0 : Math.min(i + 1, filtered.length - 1),
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[highlightIndex]
      if (item) pick(item.value)
      return
    }
  }

  const menu = open ? (
    <div
      id={listId}
      role="listbox"
      style={portal ? (menuStyle ?? undefined) : undefined}
      className={[
        'overflow-hidden rounded-xl border border-cloud bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.28)]',
        portal ? '' : 'absolute left-0 top-full z-50 mt-1 w-full min-w-[11rem]',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 border-b border-cloud px-2.5 py-1.5">
        <Search size={14} strokeWidth={2} className="shrink-0 text-mute" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onListKeyDown}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-mute"
          aria-autocomplete="list"
          aria-controls={listId}
        />
      </div>
      <ul className="max-h-52 overflow-y-auto py-1">
        {!required && !query.trim() ? (
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className={[
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition',
                !value
                  ? 'bg-ink/[0.06] font-medium text-navy'
                  : 'text-mute hover:bg-ink/[0.04]',
              ].join(' ')}
              onClick={() => pick('')}
            >
              <span className="min-w-0 flex-1 truncate">{placeholder}</span>
              {!value ? (
                <Check
                  size={14}
                  strokeWidth={2.25}
                  className="shrink-0 text-navy"
                  aria-hidden
                />
              ) : null}
            </button>
          </li>
        ) : null}
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-[12px] text-mute">{emptyMessage}</li>
        ) : (
          filtered.map((option, index) => {
            const isSelected = option.value === value
            const isHighlighted = index === highlightIndex
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={[
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition',
                    isHighlighted ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.04]',
                    isSelected ? 'font-medium text-navy' : 'text-ink',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => pick(option.value)}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? (
                    <Check
                      size={14}
                      strokeWidth={2.25}
                      className="shrink-0 text-navy"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  ) : null

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={value}
        required={required}
        onChange={() => {}}
      />
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
        onKeyDown={onTriggerKeyDown}
        className={[
          compact
            ? 'flex h-full min-h-8 w-full items-center justify-between gap-1 bg-transparent px-2 py-1.5 text-left text-[12px] outline-none focus:bg-navy/[0.04]'
            : 'mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[14px] outline-none transition',
          !compact &&
            (invalid
              ? 'border-spark/50 focus:border-spark/50 focus:ring-2 focus:ring-spark/15'
              : 'border-cloud focus:border-navy/40 focus:ring-2 focus:ring-navy/10'),
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          selected ? 'text-ink' : 'text-mute',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="min-w-0 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={compact ? 14 : 16}
          strokeWidth={2}
          className={`shrink-0 text-mute transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {portal && typeof document !== 'undefined'
        ? createPortal(menu, document.body)
        : menu}
    </div>
  )
}
