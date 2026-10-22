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
    <div className="rounded-2xl border border-cloud bg-white p-6 shadow-sm">
      <h2 className="text-[16px] font-semibold text-ink">Full shop backup</h2>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-mute">
        One zip file with your database, product photos, site media, and
        public images. This can take a few minutes if you have many photos.
        Keep the file private — it may include customer and payment settings.
      </p>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-[13px] text-mute">
        <li>database/ — all tables as JSON</li>
        <li>object-storage/ — MinIO buckets (images &amp; videos)</li>
        <li>public-images/ — files from public/images</li>
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className={adminButtonClassName('primary')}
        >
          {busy ? (
            <Loader2 size={16} className="mr-2 animate-spin" aria-hidden />
          ) : (
            <Download size={16} className="mr-2" aria-hidden />
          )}
          {busy ? 'Preparing backup…' : 'Download backup'}
        </button>
      </div>
    </div>
  )
}
