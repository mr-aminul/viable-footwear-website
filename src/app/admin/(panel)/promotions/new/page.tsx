import { redirect } from 'next/navigation'
import { offerPromoPath } from '@/lib/offers/paths'

export default function NewPromotionRedirectPage() {
  redirect(offerPromoPath())
}
