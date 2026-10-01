import { WebsitePopupEditor } from '@/components/admin/WebsitePopupEditor'
import { getSiteContentFresh } from '@/lib/website/queries'

export const metadata = {
  title: 'Marketing popup · Website Modifier',
  robots: { index: false, follow: false },
}

export default async function WebsitePopupAdminPage() {
  const content = await getSiteContentFresh()
  return <WebsitePopupEditor initial={content} />
}
