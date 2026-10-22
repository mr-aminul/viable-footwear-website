import { requireRole } from '@/lib/auth/session'
import { BackupDownloadPanel } from '@/components/admin/BackupDownloadPanel'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Backup',
  robots: { index: false, follow: false },
}

export default async function BackupPage() {
  await requireRole('admin')

  return (
    <>
      <AdminPageHeader
        title="Backup"
        description="Download a copy of your shop data so you are never locked out again. Store the zip on your laptop or a USB drive — not only on this server."
      />
      <div className="mt-8">
        <BackupDownloadPanel />
      </div>
    </>
  )
}
