'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link2 } from 'lucide-react'

export type SiteLinkCategory = {
  name: string
  slug: string
}

type LinkKind = 'shop' | 'sale' | 'about' | 'category' | 'custom'

type ParsedLink = {
  kind: LinkKind
  categorySlug: string
  custom: string
}

function parseHref(href: string): ParsedLink {
  const raw = (href || '').trim()
  if (!raw || raw === '/shop') {
    return { kind: 'shop', categorySlug: '', custom: raw || '/shop' }
  }
  if (raw === '/shop?sale=1' || raw.startsWith('/shop?sale=')) {
    return { kind: 'sale', categorySlug: '', custom: raw }
  }
  if (raw === '/about') {
    return { kind: 'about', categorySlug: '', custom: raw }
  }

  try {
    const url = new URL(raw, 'https://viable.local')
    if (url.pathname === '/shop') {
      const category = url.searchParams.get('category')
      if (category) {
        return { kind: 'category', categorySlug: category, custom: raw }
      }
      if (url.searchParams.has('sale')) {
        return { kind: 'sale', categorySlug: '', custom: raw }
      }
      return { kind: 'shop', categorySlug: '', custom: raw }
    }
  } catch {
    // Fall through to custom.
  }

  return { kind: 'custom', categorySlug: '', custom: raw }
}

function buildHref(
  kind: LinkKind,
  categorySlug: string,
  custom: string,
): string {
  switch (kind) {
    case 'shop':
      return '/shop'
    case 'sale':
      return '/shop?sale=1'
    case 'about':
      return '/about'
    case 'category':
      return categorySlug ? `/shop?category=${categorySlug}` : '/shop'
    case 'custom':
      return custom.trim() || '/shop'
  }
}

function destinationLabel(parsed: ParsedLink, categories: SiteLinkCategory[]) {
  switch (parsed.kind) {
    case 'shop':
      return 'Shop'
    case 'sale':
      return 'Sale'
    case 'about':
      return 'About'
    case 'category': {
      const match = categories.find((c) => c.slug === parsed.categorySlug)
      return match?.name ?? 'Category'
    }
    case 'custom':
      return 'Custom'
  }
}

type SiteLinkPickerProps = {
  value: string
  onChange: (href: string) => void
  categories: SiteLinkCategory[]
  variant?: 'dark' | 'light'
  /** Kept for API compatibility; unused in compact mode. */
  label?: string
}

/**
 * Compact destination control — icon + portal popover so it isn’t clipped by
 * overflow:hidden section parents.
 */
export function SiteLinkPicker({
  value,
  onChange,
  categories,
  variant = 'light',
}: SiteLinkPickerProps) {
  const parsed = parseHref(value)
  const isDark = variant === 'dark'
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    top: 0,
    left: 0,
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return

    const place = () => {
      const trigger = rootRef.current
      const panel = panelRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const panelHeight = panel?.offsetHeight ?? 200
      const panelWidth = panel?.offsetWidth ?? 248
      const gap = 6
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < panelHeight + gap + 12
      const top = openUp
        ? Math.max(8, rect.top - panelHeight - gap)
        : rect.bottom + gap
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - panelWidth - 8,
      )
      setPanelStyle({ top, left, position: 'fixed' })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, parsed.kind])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const setKind = (kind: LinkKind) => {
    const firstSlug = categories[0]?.slug ?? ''
    const nextSlug =
      kind === 'category'
        ? parsed.categorySlug || firstSlug
        : parsed.categorySlug
    onChange(buildHref(kind, nextSlug, parsed.custom || value || '/shop'))
  }

  const triggerClass = isDark
    ? 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 opacity-70 transition hover:bg-white/20 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
    : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cloud bg-white text-navy/70 opacity-70 shadow-sm transition hover:opacity-100 hover:text-navy focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spark/40'

  const panelClass = isDark
    ? 'z-[100] w-[15.5rem] rounded-xl border border-white/20 bg-navy-deep p-2.5 shadow-lift'
    : 'z-[100] w-[15.5rem] rounded-xl border border-cloud bg-white p-2.5 shadow-lift'

  const selectClass = isDark
    ? 'w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[12px] text-white outline-none focus:border-spark'
    : 'w-full rounded-lg border border-cloud bg-paper px-2 py-1.5 text-[12px] text-ink outline-none focus:border-navy/40 focus:ring-2 focus:ring-spark/25'

  const inputClass = isDark
    ? 'mt-1.5 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[12px] text-white outline-none placeholder:text-white/45 focus:border-spark'
    : 'mt-1.5 w-full rounded-lg border border-cloud bg-paper px-2 py-1.5 text-[12px] text-ink outline-none placeholder:text-mute focus:border-navy/40 focus:ring-2 focus:ring-spark/25'

  const hintClass = isDark ? 'text-white/55' : 'text-mute'

  const panel =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Link destination"
            className={panelClass}
            style={panelStyle}
          >
            <p
              className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${hintClass}`}
            >
              Goes to
            </p>
            <select
              value={parsed.kind}
              onChange={(e) => setKind(e.target.value as LinkKind)}
              aria-label="Link destination"
              className={selectClass}
            >
              <option value="shop">Shop — all products</option>
              <option value="sale">Sale page</option>
              <option value="about">About page</option>
              <option value="category" disabled={categories.length === 0}>
                A product category
              </option>
              <option value="custom">Custom link</option>
            </select>

            {parsed.kind === 'category' ? (
              <select
                value={parsed.categorySlug}
                onChange={(e) =>
                  onChange(buildHref('category', e.target.value, parsed.custom))
                }
                aria-label="Category"
                className={`mt-1.5 ${selectClass}`}
              >
                {categories.length === 0 ? (
                  <option value="">No categories yet</option>
                ) : null}
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            ) : null}

            {parsed.kind === 'custom' ? (
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Custom link"
                placeholder="/shop or https://…"
                className={inputClass}
              />
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`Link destination: ${destinationLabel(parsed, categories)}`}
        aria-expanded={open}
        aria-controls={panelId}
        title={destinationLabel(parsed, categories)}
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      {panel}
    </div>
  )
}
