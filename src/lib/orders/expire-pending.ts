import { createServiceClient } from '@/lib/supabase/admin'
import { revalidateAdminOrders } from '@/lib/orders/cache-tags'

const ABANDONED_PENDING_HOURS = 24

/**
 * Cancel unpaid gateway checkouts older than 24h (stock was never held).
 * Best-effort; safe to call from admin order views.
 */
export async function expireAbandonedPendingOrders(): Promise<number> {
  const supabase = createServiceClient()
  const cutoff = new Date(
    Date.now() - ABANDONED_PENDING_HOURS * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    console.error('[orders] expire pending', error)
    return 0
  }

  const count = data?.length ?? 0
  if (count > 0) revalidateAdminOrders()
  return count
}
