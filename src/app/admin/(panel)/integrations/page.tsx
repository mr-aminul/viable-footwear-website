import { requireRole } from '@/lib/auth/session'
import { getBkashSettingsView } from '@/lib/integrations/bkash-settings'
import {
  getGtmSettingsView,
  getMetaPixelSettingsView,
} from '@/lib/integrations/marketing-settings'
import { getNagadSettingsView } from '@/lib/integrations/nagad-settings'
import { getOmsWebhookSettingsView } from '@/lib/integrations/oms-webhook-settings'
import { getPathaoSettingsView } from '@/lib/integrations/pathao-settings'
import { IntegrationsPanel } from '@/components/admin/IntegrationsPanel'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Integrations',
  robots: { index: false, follow: false },
}

export default async function IntegrationsPage() {
  await requireRole('admin')
  const [pathao, bkash, nagad, gtm, meta, oms] = await Promise.all([
    getPathaoSettingsView(),
    getBkashSettingsView(),
    getNagadSettingsView(),
    getGtmSettingsView(),
    getMetaPixelSettingsView(),
    getOmsWebhookSettingsView(),
  ])

  return (
    <>
      <AdminPageHeader title="Integrations" />
      <IntegrationsPanel
        pathao={pathao}
        bkash={bkash}
        nagad={nagad}
        gtm={gtm}
        meta={meta}
        oms={oms}
      />
    </>
  )
}
