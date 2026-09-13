import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/session'
import { formatPrice } from '@/lib/brand'
import { getOrderById } from '@/lib/orders/queries'
import { AdminPageHeader } from '@/components/admin/ui'
import { DispatchPathaoButton } from '@/components/admin/DispatchPathaoButton'

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

  const alreadyDispatched = Boolean(order.pathao_consignment_id)
  const address = [
    order.address,
    order.area_name,
    order.zone_name,
    order.city_name,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <AdminPageHeader
        title={order.order_number}
        description={`${order.full_name} · ${order.payment_method.toUpperCase()}`}
        backHref="/admin/orders"
        backLabel="Back to orders"
        actions={
          !alreadyDispatched && order.status !== 'cancelled' ? (
            <DispatchPathaoButton orderId={order.id} />
          ) : null
        }
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
              <dt className="text-mute">Status</dt>
              <dd className="font-medium capitalize text-ink">{order.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Subtotal</dt>
              <dd className="font-medium text-ink">
                {formatPrice(Number(order.subtotal))}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Delivery + COD fee</dt>
              <dd className="font-medium text-ink">
                {formatPrice(Number(order.shipping))}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Pathao delivery</dt>
              <dd className="font-medium text-ink">
                {order.pathao_delivery_fee != null
                  ? formatPrice(Number(order.pathao_delivery_fee))
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-cloud pt-2">
              <dt className="font-semibold text-ink">Amount to collect</dt>
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
            {order.pathao_error ? (
              <p className="mt-2 rounded-xl bg-spark/5 px-3 py-2 text-[12px] text-spark">
                {order.pathao_error}
              </p>
            ) : null}
          </dl>
        </section>
      </div>

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
