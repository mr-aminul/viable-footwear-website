import { redirect } from 'next/navigation'
import { offerDeliveryPath } from '@/lib/offers/paths'

export default function NewCampaignRedirectPage() {
  redirect(offerDeliveryPath())
}
