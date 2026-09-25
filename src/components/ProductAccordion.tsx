'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function ProductAccordion({
  title,
  children,
  defaultOpen = false,
  id,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  id?: string
}) {
  const reactId = useId()
  const panelId = `accordion-panel-${reactId}`
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!id || typeof window === 'undefined') return
    if (window.location.hash === `#${id}`) setOpen(true)
  }, [id])

  return (
    <div className="border-b border-cloud" id={id}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-mute transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="pb-5 text-[14px] leading-relaxed text-mute"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
