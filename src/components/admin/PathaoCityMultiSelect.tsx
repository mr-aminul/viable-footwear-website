'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { softFieldClassName } from '@/components/admin/ui'

type PathaoCity = {
  city_id: number
  city_name: string
}

export function PathaoCityMultiSelect({
  selectedIds,
  onChange,
  disabled,
  placeholder = 'Select cities…',
}: {
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cities, setCities] = useState<PathaoCity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetch('/api/pathao/cities', { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json()) as {
          success?: boolean
          data?: PathaoCity[]
          error?: string
        }
        if (!res.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error(json.error || 'Could not load Pathao cities.')
        }
        if (!cancelled) setCities(json.data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Could not load Pathao cities.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const nameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const city of cities) map.set(city.city_id, city.city_name)
    return map
  }, [cities])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => c.city_name.toLowerCase().includes(q))
  }, [cities, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const t = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (cityId: number) => {
    if (selectedSet.has(cityId)) {
      onChange(selectedIds.filter((id) => id !== cityId))
      return
    }
    onChange([...selectedIds, cityId])
  }

  const remove = (cityId: number) => {
    onChange(selectedIds.filter((id) => id !== cityId))
  }

  const triggerLabel =
    selectedIds.length === 0
      ? placeholder
      : `${selectedIds.length} cit${selectedIds.length === 1 ? 'y' : 'ies'} selected`

  return (
    <div ref={rootRef} className="relative space-y-2">
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2.5 py-1 text-[12px] font-medium text-ink"
            >
              {nameById.get(id) ?? `City ${id}`}
              <button
                type="button"
                className="rounded-full p-0.5 text-mute transition hover:bg-ink/10 hover:text-ink disabled:opacity-50"
                onClick={() => remove(id)}
                disabled={disabled}
                aria-label={`Remove ${nameById.get(id) ?? id}`}
              >
                <X size={12} strokeWidth={2.25} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled && !loading) setOpen((v) => !v)
        }}
        className={`${softFieldClassName} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
          selectedIds.length > 0 ? 'text-ink' : 'text-mute'
        }`}
      >
        <span className="min-w-0 truncate">
          {loading ? 'Loading cities…' : triggerLabel}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-mute transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {loadError ? (
        <p className="text-[12px] text-spark">{loadError}</p>
      ) : null}

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-cloud bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.28)]"
        >
          <div className="flex items-center gap-2 border-b border-cloud px-3 py-2">
            <Search size={15} strokeWidth={2} className="shrink-0 text-mute" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city…"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
              disabled={disabled}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-2.5 text-[13px] text-mute">
                {cities.length === 0
                  ? 'No cities returned from Pathao.'
                  : 'No cities match your search.'}
              </li>
            ) : (
              filtered.map((city) => {
                const checked = selectedSet.has(city.city_id)
                return (
                  <li
                    key={city.city_id}
                    role="option"
                    aria-selected={checked}
                  >
                    <button
                      type="button"
                      className={[
                        'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14px] transition hover:bg-ink/[0.04]',
                        checked ? 'font-medium text-navy' : 'text-ink',
                      ].join(' ')}
                      onClick={() => toggle(city.city_id)}
                      disabled={disabled}
                    >
                      <span
                        className={[
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          checked
                            ? 'border-navy bg-navy text-white'
                            : 'border-cloud bg-white',
                        ].join(' ')}
                        aria-hidden
                      >
                        {checked ? (
                          <Check size={11} strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {city.city_name}
                      </span>
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
