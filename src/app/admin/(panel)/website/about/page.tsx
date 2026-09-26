import { WebsiteAboutEditor } from '@/components/admin/WebsiteAboutEditor'
import { getAboutPageContentFresh } from '@/lib/website/queries'

export const metadata = {
  title: 'Edit About · Website Modifier',
  robots: { index: false, follow: false },
}

export default async function WebsiteAboutAdminPage() {
  const content = await getAboutPageContentFresh()
  return <WebsiteAboutEditor initial={content} />
}
