'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { adminButtonClassName } from '@/components/admin/ui'

type SaveHandler = () => Promise<boolean> | boolean

type Registration = {
  id: string
  isDirty: boolean
  onSave: SaveHandler | null
}

type PendingNavigation =
  | { type: 'href'; href: string }
  | { type: 'back' }
  | { type: 'action'; run: () => void }

type UnsavedChangesContextValue = {
  register: (registration: Registration) => () => void
  /** Allow the next in-app navigation without showing the confirm dialog. */
  allowNextNavigation: () => void
  /**
   * Run `action` immediately if clean; otherwise open the confirm dialog and
   * run it only after Discard or a successful Save.
   */
  confirmLeave: (action: () => void) => void
  isDirty: boolean
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
)

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function resolveSameOriginPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

function isSameLocation(href: string) {
  try {
    const next = new URL(href, window.location.href)
    return (
      next.pathname === window.location.pathname &&
      next.search === window.location.search &&
      next.hash === window.location.hash
    )
  } catch {
    return false
  }
}

function UnsavedChangesDialog({
  open,
  canSave,
  isSaving,
  onStay,
  onDiscard,
  onSave,
}: {
  open: boolean
  canSave: boolean
  isSaving: boolean
  onStay: () => void
  onDiscard: () => void
  onSave: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const titleId = 'unsaved-changes-title'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) return
      event.preventDefault()
      event.stopImmediatePropagation()
      onStay()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, isSaving, onStay])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        onClick={onStay}
        disabled={isSaving}
        aria-label="Stay on page"
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-cloud bg-white p-6 text-ink shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-bold text-ink"
            >
              Unsaved changes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              You have edits that haven&apos;t been saved yet. Leave without
              saving, or save before you go.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mute hover:bg-mist hover:text-ink"
            onClick={onStay}
            disabled={isSaving}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={adminButtonClassName('ghost')}
            onClick={onStay}
            disabled={isSaving}
          >
            Stay
          </button>
          <button
            type="button"
            className={adminButtonClassName('secondary')}
            onClick={onDiscard}
            disabled={isSaving}
          >
            Discard
          </button>
          {canSave ? (
            <button
              type="button"
              className={adminButtonClassName('primary')}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden
                  />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Admin-wide unsaved-changes guard. Forms register dirty state; the provider
 * intercepts in-app link clicks, browser back, and tab close/refresh.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const registrationsRef = useRef(new Map<string, Registration>())
  const [isDirty, setIsDirty] = useState(false)
  const [canSave, setCanSave] = useState(false)
  const [pending, setPending] = useState<PendingNavigation | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const bypassRef = useRef(false)
  const dirtyRef = useRef(false)

  const recompute = useCallback(() => {
    const regs = [...registrationsRef.current.values()]
    const dirtyRegs = regs.filter((reg) => reg.isDirty)
    const nextDirty = dirtyRegs.length > 0
    const nextCanSave =
      dirtyRegs.length > 0 && dirtyRegs.every((reg) => Boolean(reg.onSave))
    dirtyRef.current = nextDirty
    setIsDirty(nextDirty)
    setCanSave(nextCanSave)
    if (!nextDirty) setPending(null)
  }, [])

  const register = useCallback(
    (registration: Registration) => {
      registrationsRef.current.set(registration.id, registration)
      recompute()
      return () => {
        registrationsRef.current.delete(registration.id)
        recompute()
      }
    },
    [recompute],
  )

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true
  }, [])

  const confirmLeave = useCallback((action: () => void) => {
    if (!dirtyRef.current || bypassRef.current) {
      bypassRef.current = false
      action()
      return
    }
    setPending({ type: 'action', run: action })
  }, [])

  const proceed = useCallback(
    (next: PendingNavigation) => {
      bypassRef.current = true
      setPending(null)
      if (next.type === 'back') {
        // Dirty guard pushed one history entry; popstate handler pushed another
        // after intercepting back. Step past both to reach the real prior page.
        window.history.go(-2)
        return
      }
      if (next.type === 'action') {
        next.run()
        return
      }
      router.push(next.href)
    },
    [router],
  )

  const onStay = useCallback(() => {
    if (isSaving) return
    setPending(null)
  }, [isSaving])

  const onDiscard = useCallback(() => {
    if (isSaving || !pending) return
    proceed(pending)
  }, [isSaving, pending, proceed])

  const onSave = useCallback(async () => {
    if (!pending || isSaving) return
    const dirtyRegs = [...registrationsRef.current.values()].filter(
      (reg) => reg.isDirty,
    )
    if (dirtyRegs.some((reg) => !reg.onSave)) return

    setIsSaving(true)
    try {
      for (const reg of dirtyRegs) {
        const ok = await reg.onSave!()
        if (!ok) return
      }
      proceed(pending)
    } finally {
      setIsSaving(false)
    }
  }, [pending, isSaving, proceed])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current || bypassRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (!dirtyRef.current) return
      if (event.defaultPrevented || event.button !== 0) return
      if (isModifiedClick(event)) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      if (anchor.dataset.unsavedIgnore === 'true') return

      const rawHref = anchor.getAttribute('href')
      if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:'))
        return
      if (rawHref.startsWith('#')) return

      const path = resolveSameOriginPath(rawHref)
      if (!path) return
      if (isSameLocation(path)) return

      if (bypassRef.current) {
        bypassRef.current = false
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setPending({ type: 'href', href: path })
    }

    document.addEventListener('click', onDocumentClick, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('click', onDocumentClick, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  useEffect(() => {
    if (!isDirty) return

    const marker = { __viableUnsavedGuard: true as const }
    window.history.pushState(marker, '', window.location.href)

    const onPopState = () => {
      if (bypassRef.current) {
        bypassRef.current = false
        return
      }
      if (!dirtyRef.current) return
      window.history.pushState(marker, '', window.location.href)
      setPending({ type: 'back' })
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [isDirty])

  const value = useMemo(
    () => ({ register, allowNextNavigation, confirmLeave, isDirty }),
    [register, allowNextNavigation, confirmLeave, isDirty],
  )

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        open={Boolean(pending)}
        canSave={canSave}
        isSaving={isSaving}
        onStay={onStay}
        onDiscard={onDiscard}
        onSave={() => {
          void onSave()
        }}
      />
    </UnsavedChangesContext.Provider>
  )
}

function useUnsavedChangesContext() {
  const ctx = useContext(UnsavedChangesContext)
  if (!ctx) {
    throw new Error(
      'useUnsavedChanges must be used within UnsavedChangesProvider',
    )
  }
  return ctx
}

/**
 * Register dirty state (and optional save) with the admin navigation guard.
 * Pass an async `onSave` that returns `true` on success to enable Save in the modal.
 */
export function useUnsavedChanges(
  isDirty: boolean,
  onSave?: SaveHandler | null,
) {
  const { register, allowNextNavigation, confirmLeave } =
    useUnsavedChangesContext()
  const id = useId()
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const hasSave = Boolean(onSave)

  useEffect(() => {
    return register({
      id,
      isDirty,
      onSave: hasSave
        ? () => {
            const handler = onSaveRef.current
            if (!handler) return false
            return handler()
          }
        : null,
    })
  }, [id, isDirty, hasSave, register])

  return { allowNextNavigation, confirmLeave }
}

/** Confirm before running an in-page leave action (e.g. closing a drawer). */
export function useConfirmLeave() {
  return useUnsavedChangesContext().confirmLeave
}
