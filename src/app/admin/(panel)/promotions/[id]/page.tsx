import { redirect } from 'next/navigation'
import { offerPromoPath } from '@/lib/offers/paths'

export default async function EditPromotionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(offerPromoPath(id))
}
