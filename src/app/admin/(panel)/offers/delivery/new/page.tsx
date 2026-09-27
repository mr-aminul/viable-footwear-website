import { requireRole } from '@/lib/auth/session'
import { OFFERS_PATH } from '@/lib/offers/paths'
import { CampaignForm } from '@/components/admin/CampaignForm'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'New delivery offer',
  robots: { index: false, follow: false },
}

export default async function NewDeliveryOfferPage() {
  await requireRole(['admin', 'manager'])
  return (
    <>
      <AdminPageHeader
        title="New delivery offer"
        backHref={OFFERS_PATH}
        backLabel="Back to offers"
      />
      <CampaignForm />
    </>
  )
}
