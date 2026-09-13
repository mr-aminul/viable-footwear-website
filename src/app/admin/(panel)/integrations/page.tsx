import { requireRole } from '@/lib/auth/session'
import { getBkashSettingsView } from '@/lib/integrations/bkash-settings'
import { getPathaoSettingsView } from '@/lib/integrations/pathao-settings'
import { IntegrationsPanel } from '@/components/admin/IntegrationsPanel'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Integrations',
  robots: { index: false, follow: false },
}

export default async function IntegrationsPage() {
  await requireRole('admin')
  const [pathao, bkash] = await Promise.all([
    getPathaoSettingsView(),
    getBkashSettingsView(),
  ])

  return (
    <>
      <AdminPageHeader
        title="Integrations"
        description="Pick an integration to set it up. Pathao and bKash are ready — Nagad and tags come next."
      />
      <IntegrationsPanel pathao={pathao} bkash={bkash} />
    </>
  )
}
