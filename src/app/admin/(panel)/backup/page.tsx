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
      <AdminPageHeader title="Backup" />
      <div className="mt-4">
        <BackupDownloadPanel />
      </div>
    </>
  )
}
