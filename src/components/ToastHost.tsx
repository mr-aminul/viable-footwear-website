'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { EASE_OUT } from '@/lib/motion'

export type ToastMessage = {
  id: string
  title: string
  message: string
  tone?: 'error' | 'info'
}

type Listener = (toast: ToastMessage) => void

const listeners = new Set<Listener>()

export function showToast(input: Omit<ToastMessage, 'id'>) {
  const toast: ToastMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tone: 'error',
    ...input,
  }
  for (const listener of listeners) listener(toast)
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const onToast: Listener = (toast) => {
      setToasts((prev) => [...prev.slice(-2), toast])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 5200)
    }
    listeners.add(onToast)
    return () => {
      listeners.delete(onToast)
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={[
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lift',
              toast.tone === 'info'
                ? 'border-navy/20 bg-white text-ink'
                : 'border-spark/30 bg-white text-ink',
            ].join(' ')}
            role="status"
          >
            <div className="min-w-0 flex-1">
              <p
                className={[
                  'text-[13px] font-semibold',
                  toast.tone === 'info' ? 'text-navy' : 'text-spark',
                ].join(' ')}
              >
                {toast.title}
              </p>
              <p className="mt-0.5 text-[13px] text-ink/80">{toast.message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded-lg p-1 text-mute hover:bg-mist hover:text-ink"
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
