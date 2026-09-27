import { redirect } from 'next/navigation'
import { OFFERS_PATH } from '@/lib/offers/paths'

export default function CampaignsRedirectPage() {
  redirect(OFFERS_PATH)
}
