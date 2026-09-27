import { redirect } from 'next/navigation'
import { offerDeliveryPath } from '@/lib/offers/paths'

export default async function EditCampaignRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(offerDeliveryPath(id))
}
