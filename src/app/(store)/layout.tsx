import { getStorefrontAnnouncement } from '@/lib/campaigns/queries'
import { getPublicMarketingConfig } from '@/lib/integrations/marketing-settings'
import { getSiteContent } from '@/lib/website/queries'
import { MarketingTags } from '@/components/MarketingTags'
import { StoreProviders } from '@/components/StoreProviders'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [marketing, announcement, site] = await Promise.all([
    getPublicMarketingConfig(),
    getStorefrontAnnouncement(),
    getSiteContent(),
  ])

  return (
    <>
      <MarketingTags config={marketing} />
      <StoreProviders announcement={announcement} site={site}>
        {children}
      </StoreProviders>
    </>
  )
}
