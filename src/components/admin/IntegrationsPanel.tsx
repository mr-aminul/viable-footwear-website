'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { PathaoSettingsForm } from '@/components/admin/PathaoSettingsForm'
import type { PathaoSettingsView } from '@/lib/integrations/pathao-settings'

type IntegrationId = 'pathao' | 'bkash' | 'nagad' | 'gtm' | 'meta' | 'inventory'

type IntegrationRow = {
  id: IntegrationId
  name: string
  category: string
  available: boolean
}

const INTEGRATIONS: IntegrationRow[] = [
  { id: 'pathao', name: 'Pathao Courier', category: 'Shipping', available: true },
  { id: 'bkash', name: 'bKash', category: 'Payments', available: false },
  { id: 'nagad', name: 'Nagad', category: 'Payments', available: false },
  {
    id: 'gtm',
    name: 'Google Tag Manager',
    category: 'Marketing',
    available: false,
  },
  { id: 'meta', name: 'Meta Pixel', category: 'Marketing', available: false },
  {
    id: 'inventory',
    name: 'Inventory sync',
    category: 'Operations',
    available: false,
  },
]

function pathaoStatusLabel(pathao: PathaoSettingsView): {
  label: string
  tone: 'ok' | 'warn' | 'mute'
} {
  if (pathao.source === 'admin') return { label: 'Connected', tone: 'ok' }
  if (pathao.source === 'env') return { label: 'Env fallback', tone: 'mute' }
  return { label: 'Not set up', tone: 'warn' }
}

export function IntegrationsPanel({
  pathao,
}: {
  pathao: PathaoSettingsView
}) {
  const [openId, setOpenId] = useState<IntegrationId | null>(null)
  const titleId = useId()
  const openRow = INTEGRATIONS.find((row) => row.id === openId) ?? null

  useEffect(() => {
    if (!openId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openId])

  useEffect(() => {
    if (!openId) return
    const { body } = document
    const prev = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prev
    }
  }, [openId])

  return (
    <>
      <ul className="mt-8 divide-y divide-cloud overflow-hidden rounded-2xl border border-cloud bg-white">
        {INTEGRATIONS.map((row) => {
          const status =
            row.id === 'pathao'
              ? pathaoStatusLabel(pathao)
              : ({ label: 'Coming soon', tone: 'mute' } as const)

          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenId(row.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-mist/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{row.name}</p>
                  <p className="text-[12px] text-mute">{row.category}</p>
                </div>
                <span
                  className={[
                    'shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold',
                    status.tone === 'ok' && 'bg-navy/10 text-navy',
                    status.tone === 'warn' && 'bg-spark/10 text-spark',
                    status.tone === 'mute' && 'bg-mist text-mute',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {status.label}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-mute"
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>

      <SideDrawer
        open={Boolean(openRow)}
        title={openRow?.name ?? ''}
        titleId={titleId}
        onClose={() => setOpenId(null)}
      >
        {openId === 'pathao' ? (
          <PathaoSettingsForm initial={pathao} embedded />
        ) : openRow ? (
          <ComingSoonPanel name={openRow.name} category={openRow.category} />
        ) : null}
      </SideDrawer>
    </>
  )
}

function SideDrawer({
  open,
  title,
  titleId,
  onClose,
  children,
}: {
  open: boolean
  title: string
  titleId: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className={[
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close panel"
        onClick={onClose}
        className={[
          'absolute inset-0 bg-ink/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper shadow-lift transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-w-lg',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 border-b border-cloud px-5 py-4">
          <h2 id={titleId} className="text-[16px] font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-mute transition hover:bg-mist hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  )
}

function ComingSoonPanel({
  name,
  category,
}: {
  name: string
  category: string
}) {
  return (
    <div className="rounded-2xl bg-mist/70 px-4 py-6">
      <p className="text-[14px] font-semibold text-ink">{name}</p>
      <p className="mt-1 text-[13px] text-mute">{category}</p>
      <p className="mt-4 text-[13px] leading-relaxed text-mute">
        Setup for this integration isn&apos;t available yet. Pathao shipping is
        ready to configure now.
      </p>
    </div>
  )
}
