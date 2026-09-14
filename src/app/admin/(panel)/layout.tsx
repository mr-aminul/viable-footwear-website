import { AdminShell } from '@/components/admin/AdminShell'
import { requireRole } from '@/lib/auth/session'

export const metadata = {
  robots: { index: false, follow: false },
}

/**
 * Shared authenticated shell — persists across admin navigations.
 * Badge count is fetched client-side so layout stays auth-only and warm.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole(['admin', 'manager'])
  return <AdminShell profile={session.profile}>{children}</AdminShell>
}
