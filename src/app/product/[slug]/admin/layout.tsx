import { AdminShell } from '@/components/admin/AdminShell'
import { requireRole } from '@/lib/auth/session'

export const metadata = {
  robots: { index: false, follow: false },
}

/**
 * Product admin editor chrome — same shell as /admin/* panel routes.
 */
export default async function ProductAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole(['admin', 'manager'])
  return <AdminShell profile={session.profile}>{children}</AdminShell>
}
