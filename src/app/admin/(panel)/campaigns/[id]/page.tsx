import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/session'
import { getCampaignById } from '@/lib/campaigns/queries'
import { CampaignForm } from '@/components/admin/CampaignForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Edit campaign',
  robots: { index: false, follow: false },
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['admin', 'manager'])
  const { id } = await params
  const campaign = await getCampaignById(id)
  if (!campaign) notFound()

  return (
    <>
      <AdminPageHeader
        title={campaign.name}
        backHref="/admin/campaigns"
        backLabel="Back to campaigns"
      />
      <CampaignForm
        initial={{
          id: campaign.id,
          name: campaign.name,
          priority: campaign.priority,
          active: campaign.active,
          starts_at: campaign.starts_at ?? '',
          ends_at: campaign.ends_at ?? '',
          rules: campaign.rules,
        }}
      />
    </>
  )
}
