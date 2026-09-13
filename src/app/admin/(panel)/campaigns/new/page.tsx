import { requireRole } from '@/lib/auth/session'
import { CampaignForm } from '@/components/admin/CampaignForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'New campaign',
  robots: { index: false, follow: false },
}

export default async function NewCampaignPage() {
  await requireRole(['admin', 'manager'])
  return (
    <>
      <AdminPageHeader
        title="New campaign"
        backHref="/admin/campaigns"
        backLabel="Back to campaigns"
      />
      <CampaignForm />
    </>
  )
}
