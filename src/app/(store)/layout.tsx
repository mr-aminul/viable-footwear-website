import { getPublicMarketingConfig } from '@/lib/integrations/marketing-settings'
import { MarketingTags } from '@/components/MarketingTags'
import { StoreProviders } from '@/components/StoreProviders'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const marketing = await getPublicMarketingConfig()

  return (
    <>
      <MarketingTags config={marketing} />
      <StoreProviders>{children}</StoreProviders>
    </>
  )
}
