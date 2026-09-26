import { WebsiteSiteEditor } from '@/components/admin/WebsiteSiteEditor'
import { getSiteContentFresh } from '@/lib/website/queries'

export const metadata = {
  title: 'Site settings · Website Modifier',
  robots: { index: false, follow: false },
}

export default async function WebsiteSiteAdminPage() {
  const content = await getSiteContentFresh()
  return <WebsiteSiteEditor initial={content} />
}
