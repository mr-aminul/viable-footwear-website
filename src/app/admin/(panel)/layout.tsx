import { AdminShell } from '@/components/admin/AdminShell'
import { requireRole } from '@/lib/auth/session'
import { countUndispatchedOrders } from '@/lib/orders/queries'

export const metadata = {
  robots: { index: false, follow: false },
}

/**
 * Shared authenticated shell — persists across admin navigations.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole(['admin', 'manager'])
  const undispatchedOrderCount = await countUndispatchedOrders()
  return (
    <AdminShell
      profile={session.profile}
      undispatchedOrderCount={undispatchedOrderCount}
    >
      {children}
    </AdminShell>
  )
}
