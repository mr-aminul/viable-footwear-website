'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { adminButtonClassName } from '@/components/admin/ui'

/**
 * Triggers a full shop backup download. Uses a plain navigation so the
 * browser can stream the zip to disk instead of buffering in JS memory.
 */
export function BackupDownloadPanel() {
  const [busy, setBusy] = useState(false)

  const onDownload = () => {
    setBusy(true)
    // Hidden iframe keeps you on this page while the zip downloads.
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = `/api/admin/backup?t=${Date.now()}`
    document.body.appendChild(iframe)
    window.setTimeout(() => {
      setBusy(false)
      iframe.remove()
    }, 60_000)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cloud bg-white px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-ink">Full shop backup</h2>
        <p className="mt-0.5 text-[12px] text-mute">
          Database + media zip. Keep the file private.
        </p>
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        className={adminButtonClassName('primary')}
      >
        {busy ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden />
        ) : (
          <Download size={14} className="mr-1.5" aria-hidden />
        )}
        {busy ? 'Preparing…' : 'Download backup'}
      </button>
    </div>
  )
}
