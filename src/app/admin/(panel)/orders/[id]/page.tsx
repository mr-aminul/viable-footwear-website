import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { formatPrice } from '@/lib/brand'
import {
  getCampaignNameById,
  getOrderById,
  getPaymentAttemptsForOrder,
} from '@/lib/orders/queries'
import { pathaoTrackingUrl } from '@/lib/orders/pathao-tracking'
import {
  isPathaoShipmentStranded,
  pathaoStatusLabel,
  storeStatusLabel,
} from '@/lib/orders/status-labels'
import { AdminPageHeader } from '@/components/admin/ui'
import { OrderAdminActions } from '@/components/admin/OrderAdminActions'
import { OrderStatusControl } from '@/components/admin/OrderStatusControl'

export const metadata = {
  title: 'Order detail',
  robots: { index: false, follow: false },
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['admin', 'manager'])
  const { id } = await params
  const order = await getOrderById(id)
  if (!order) notFound()

  const [campaignName, paymentAttempts] = await Promise.all([
    getCampaignNameById(order.campaign_id),
    getPaymentAttemptsForOrder(order.id),
  ])

  const stranded = isPathaoShipmentStranded(order)
  const trackingUrl = order.pathao_consignment_id
    ? pathaoTrackingUrl(order.pathao_consignment_id, order.phone)
    : null
  const address = [
    order.address,
    order.area_name,
    order.zone_name,
    order.city_name,
  ]
    .filter(Boolean)
    .join(', ')

  const pathaoBase =
    order.pathao_delivery_fee != null ? Number(order.pathao_delivery_fee) : null
  const customerShipping = Number(order.shipping)
  const codFeePortion =
    pathaoBase != null ? Math.max(0, customerShipping - pathaoBase) : null
  const completedAttempt = paymentAttempts.find((a) => a.status === 'completed')

  return (
    <>
      <AdminPageHeader
        title={order.order_number}
        description={`${order.full_name} · ${order.payment_method.toUpperCase()}`}
        backHref="/admin/orders"
        backLabel="Back to orders"
        actions={<OrderAdminActions order={order} showSync />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-cloud bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Customer
          </h2>
          <dl className="mt-4 space-y-2 text-[14px]">
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Name</dt>
              <dd className="font-medium text-ink">{order.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Phone</dt>
              <dd className="font-medium text-ink">{order.phone}</dd>
            </div>
            {order.secondary_phone ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Secondary</dt>
                <dd className="font-medium text-ink">{order.secondary_phone}</dd>
              </div>
            ) : null}
            {order.email ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Email</dt>
                <dd className="font-medium text-ink">{order.email}</dd>
              </div>
            ) : null}
            <div className="pt-2">
              <dt className="text-mute">Address</dt>
              <dd className="mt-1 font-medium text-ink">{address}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-cloud bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
            Payment & shipping
          </h2>
          <dl className="mt-4 space-y-2 text-[14px]">
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Order status</dt>
              <dd className="font-medium text-ink">
                {storeStatusLabel(order.status)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Payment</dt>
              <dd className="font-medium uppercase text-ink">
                {order.payment_method}
              </dd>
            </div>
            {order.paid_at ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Paid at</dt>
                <dd className="font-medium text-ink">
                  {new Date(order.paid_at).toLocaleString('en-BD')}
                </dd>
              </div>
            ) : null}
            {order.payment_trx_id || completedAttempt?.trx_id ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Transaction ID</dt>
                <dd className="font-mono text-[13px] font-medium text-ink">
                  {order.payment_trx_id || completedAttempt?.trx_id}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Pathao status</dt>
              <dd className="font-medium text-ink">
                {stranded
                  ? 'Still active — cancel Pathao'
                  : order.pathao_consignment_id
                    ? pathaoStatusLabel(order.pathao_status)
                    : 'Not sent'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Subtotal</dt>
              <dd className="font-medium text-ink">
                {formatPrice(Number(order.subtotal))}
              </dd>
            </div>
            {pathaoBase != null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Pathao delivery (base)</dt>
                <dd className="font-medium text-ink">
                  {formatPrice(pathaoBase)}
                </dd>
              </div>
            ) : null}
            {campaignName ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Campaign</dt>
                <dd className="font-medium text-ink">{campaignName}</dd>
              </div>
            ) : order.campaign_id ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Campaign</dt>
                <dd className="font-mono text-[12px] text-mute">
                  {order.campaign_id}
                </dd>
              </div>
            ) : null}
            {order.payment_method === 'cod' && codFeePortion != null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">COD fee (in delivery)</dt>
                <dd className="font-medium text-ink">
                  {formatPrice(codFeePortion)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Customer delivery charge</dt>
              <dd className="font-medium text-ink">
                {formatPrice(customerShipping)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-cloud pt-2">
              <dt className="font-semibold text-ink">
                {order.payment_method === 'cod'
                  ? 'Amount to collect'
                  : 'Order total'}
              </dt>
              <dd className="font-semibold text-ink">
                {formatPrice(Number(order.total))}
              </dd>
            </div>
            <div className="flex justify-between gap-4 pt-2">
              <dt className="text-mute">Pathao consignment</dt>
              <dd className="font-mono text-[13px] font-medium text-ink">
                {order.pathao_consignment_id || '—'}
              </dd>
            </div>
            {trackingUrl ? (
              <div className="pt-1">
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline"
                >
                  Open Pathao tracking
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            ) : null}
            {order.pathao_cancelled_at ? (
              <div className="flex justify-between gap-4">
                <dt className="text-mute">Pathao cancelled</dt>
                <dd className="font-medium text-ink">
                  {new Date(order.pathao_cancelled_at).toLocaleString('en-BD')}
                </dd>
              </div>
            ) : null}
            {order.pathao_error ? (
              <p className="mt-2 rounded-xl bg-spark/5 px-3 py-2 text-[12px] text-spark">
                {order.pathao_error}
              </p>
            ) : null}
            {order.notes ? (
              <p className="mt-2 text-[12px] text-mute">{order.notes}</p>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-cloud bg-white p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
          Status
        </h2>
        <p className="mt-2 text-[14px] text-ink">
          Current: <span className="font-semibold">{storeStatusLabel(order.status)}</span>
        </p>
        <div className="mt-4 max-w-md">
          <OrderStatusControl orderId={order.id} status={order.status} />
        </div>
        {order.pathao_consignment_id ? (
          <p className="mt-3 text-[12px] text-mute">
            Prefer Sync Pathao for in-transit / delivered updates when a
            consignment exists.
          </p>
        ) : null}
      </section>

      {paymentAttempts.length > 0 ? (
        <section className="mt-6 overflow-x-auto rounded-2xl border border-cloud bg-white">
          <div className="border-b border-cloud px-4 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
              Payment attempts
            </h2>
          </div>
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
              <tr>
                <th className="px-4 py-3 font-semibold">Gateway</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Trx / external</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {paymentAttempts.map((attempt) => (
                <tr
                  key={attempt.id}
                  className="border-b border-cloud last:border-0"
                >
                  <td className="px-4 py-3 uppercase">{attempt.gateway}</td>
                  <td className="px-4 py-3">{attempt.status}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">
                    {attempt.trx_id || attempt.external_id || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(Number(attempt.amount))}
                  </td>
                  <td className="px-4 py-3 text-mute">
                    {new Date(attempt.created_at).toLocaleString('en-BD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mt-6 overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Line</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-cloud last:border-0">
                <td className="px-4 py-3 font-medium text-ink">
                  {item.product_name}
                  {item.color ? (
                    <span className="ml-1 text-mute">· {item.color}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-mute">
                  {item.size_eu != null ? `EU ${item.size_eu}` : '—'}
                </td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">
                  {formatPrice(Number(item.unit_price))}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatPrice(Number(item.unit_price) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
