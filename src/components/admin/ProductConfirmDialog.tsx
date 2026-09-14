'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { adminButtonClassName } from '@/components/admin/ui'

type ProductConfirmDialogProps = {
  count: number
  isSubmitting: boolean
  confirmText: string
  onConfirmTextChange: (value: string) => void
  canConfirm: boolean
  onDismiss: () => void
  onConfirm: () => void
}

export function ProductConfirmDialog({
  count,
  isSubmitting,
  confirmText,
  onConfirmTextChange,
  canConfirm,
  onDismiss,
  onConfirm,
}: ProductConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)
  const titleId = 'delete-product-title'
  const inputId = 'delete-product-confirm'
  const title =
    count === 1 ? 'Delete 1 product?' : `Delete ${count} products?`
  const description =
    count === 1
      ? 'This permanently removes the product, its variants, and media. Order history keeps the line-item snapshot. This cannot be undone.'
      : `This permanently removes these ${count} products, their variants, and media. Order history keeps line-item snapshots. This cannot be undone.`
  const confirmLabel =
    count === 1 ? 'Delete product' : `Delete ${count} products`

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        onClick={onDismiss}
        disabled={isSubmitting}
        aria-label="Close dialog"
      />

      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-cloud bg-white p-6 text-ink shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-bold text-ink"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              {description}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mute hover:bg-mist hover:text-ink"
            onClick={onDismiss}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label
          htmlFor={inputId}
          className="mt-6 block text-sm font-medium text-ink"
        >
          Type{' '}
          <span className="rounded bg-spark/10 px-1.5 py-0.5 font-mono text-[12px] text-spark">
            delete
          </span>{' '}
          to confirm
        </label>
        <input
          id={inputId}
          type="text"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          placeholder="delete"
          className="mt-2 w-full rounded-xl border border-cloud bg-white px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-mute focus:border-navy/40"
          autoComplete="off"
          autoFocus
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canConfirm && !isSubmitting) {
              e.preventDefault()
              onConfirm()
            }
          }}
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={adminButtonClassName('ghost')}
            onClick={onDismiss}
            disabled={isSubmitting}
          >
            Dismiss
          </button>
          <button
            type="button"
            className={adminButtonClassName('danger')}
            onClick={onConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Deleting…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
