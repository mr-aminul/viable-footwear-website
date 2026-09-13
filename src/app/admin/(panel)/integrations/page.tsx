import { requireRole } from '@/lib/auth/session'
import { getPathaoSettingsView } from '@/lib/integrations/pathao-settings'
import { IntegrationsPanel } from '@/components/admin/IntegrationsPanel'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Integrations',
  robots: { index: false, follow: false },
}

export default async function IntegrationsPage() {
  await requireRole('admin')
  const pathao = await getPathaoSettingsView()

  return (
    <>
      <AdminPageHeader
        title="Integrations"
        description="Pick an integration to set it up. Pathao shipping is ready — payments and tags come next."
      />
      <IntegrationsPanel pathao={pathao} />
    </>
  )
}
