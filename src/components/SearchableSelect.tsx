'use client'

import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react'
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
  ref,
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)

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
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
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
  }, [open])

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

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Native value for HTML5 required / form semantics */}
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
        onKeyDown={onTriggerKeyDown}
        className={[
          'mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[14px] outline-none transition',
          invalid
            ? 'border-spark/50 focus:border-spark/50 focus:ring-2 focus:ring-spark/15'
            : 'border-cloud focus:border-navy/40 focus:ring-2 focus:ring-navy/10',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          selected ? 'text-ink' : 'text-mute',
        ].join(' ')}
      >
        <span className="min-w-0 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-mute transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-cloud bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.28)]"
        >
          <div className="flex items-center gap-2 border-b border-cloud px-3 py-2">
            <Search size={15} strokeWidth={2} className="shrink-0 text-mute" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onListKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
              aria-autocomplete="list"
              aria-controls={listId}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {!required && !query.trim() ? (
              <li role="option" aria-selected={!value}>
                <button
                  type="button"
                  className={[
                    'flex w-full items-center gap-2 px-3.5 py-2 text-left text-[14px] transition',
                    !value
                      ? 'bg-ink/[0.06] font-medium text-navy'
                      : 'text-mute hover:bg-ink/[0.04]',
                  ].join(' ')}
                  onClick={() => pick('')}
                >
                  <span className="min-w-0 flex-1 truncate">{placeholder}</span>
                  {!value ? (
                    <Check
                      size={15}
                      strokeWidth={2.25}
                      className="shrink-0 text-navy"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-3.5 py-2.5 text-[13px] text-mute">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value
                const isHighlighted = index === highlightIndex
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={[
                        'flex w-full items-center gap-2 px-3.5 py-2 text-left text-[14px] transition',
                        isHighlighted ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.04]',
                        isSelected ? 'font-medium text-navy' : 'text-ink',
                      ].join(' ')}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => pick(option.value)}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {isSelected ? (
                        <Check
                          size={15}
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
      ) : null}
    </div>
  )
}
