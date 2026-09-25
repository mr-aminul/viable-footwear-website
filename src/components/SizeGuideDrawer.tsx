'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { SIZE_CHART_ROWS } from '@/lib/catalog/size-chart'

type SizeGuideDrawerProps = {
  open: boolean
  onClose: () => void
}

const panelTransition = { duration: 0.12, ease: [0.22, 1, 0.36, 1] as const }
const overlayTransition = { duration: 0.1 }

export function SizeGuideDrawer({ open, onClose }: SizeGuideDrawerProps) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close size guide"
            className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : overlayTransition}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            className="fixed inset-y-0 right-0 z-[90] flex w-[min(100vw,520px)] flex-col bg-white shadow-lift"
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: '100%' }}
            transition={reduceMotion ? { duration: 0 } : panelTransition}
          >
            <div className="flex items-center justify-between border-b border-cloud px-5 py-4">
              <h2
                id="size-guide-title"
                className="font-display text-xl font-extrabold tracking-tight text-ink"
              >
                Size guide
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-mist"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className="text-[13px] leading-relaxed text-mute">
                Measure your foot length in millimetres and match the range
                below. If you are between sizes, size up.
              </p>

              <p className="mt-6 text-[12px] font-semibold uppercase tracking-wider text-mute">
                EU sizes and length (mm)
              </p>

              <div className="mt-3 overflow-x-auto rounded-xl border border-cloud">
                <table className="w-full min-w-[280px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-cloud bg-mist/60 text-[11px] uppercase tracking-wider text-mute">
                      <th className="px-4 py-2.5 font-semibold">Size</th>
                      <th
                        colSpan={2}
                        className="border-l border-cloud px-4 py-2 text-center font-semibold"
                      >
                        Length
                      </th>
                    </tr>
                    <tr className="border-b border-cloud bg-mist/40 text-[11px] uppercase tracking-wider text-mute">
                      <th className="px-4 py-1.5" />
                      <th className="border-l border-cloud px-4 py-1.5 font-medium">
                        From
                      </th>
                      <th className="px-4 py-1.5 font-medium">Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZE_CHART_ROWS.map((row) => (
                      <tr
                        key={row.eu}
                        className="border-b border-cloud last:border-0"
                      >
                        <td className="px-4 py-2.5 font-semibold text-ink">
                          {row.eu}
                        </td>
                        <td className="border-l border-cloud px-4 py-2.5 tabular-nums text-ink">
                          {row.lengthFromMm}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-ink">
                          {row.lengthUntilMm}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
