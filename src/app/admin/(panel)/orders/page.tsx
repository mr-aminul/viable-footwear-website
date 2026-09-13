import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { formatPrice } from '@/lib/brand'
import { listOrders } from '@/lib/orders/queries'
import { AdminPageHeader } from '@/components/admin/ui'

export const metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
}

function statusLabel(order: {
  status: string
  pathao_consignment_id: string | null
  pathao_error: string | null
}) {
  if (order.pathao_consignment_id) return 'Pathao sent'
  if (order.pathao_error) return 'Pathao failed'
  if (order.status === 'awaiting_fulfillment') return 'To ship'
  return order.status
}

export default async function OrdersPage() {
  await requireRole(['admin', 'manager'])
  const orders = await listOrders()

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="COD orders from the storefront. Dispatch to Pathao when ready to ship."
      />

      <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-mute">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-cloud last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-navy hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-mute uppercase">
                      {order.payment_method}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{order.full_name}</p>
                    <p className="text-mute">{order.phone}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatPrice(Number(order.total))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        order.pathao_consignment_id
                          ? 'text-navy'
                          : order.pathao_error
                            ? 'text-spark'
                            : 'text-ink'
                      }
                    >
                      {statusLabel(order)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mute">
                    {new Date(order.created_at).toLocaleString('en-BD', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
