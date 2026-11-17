import { OrdersImportClient } from '@/components/admin/OrdersImportClient'
import { AdminPageHeader } from '@/components/admin/ui'
import { listOrderImportPickerCatalog } from '@/lib/catalog/queries'

export const metadata = {
  title: 'Add / import orders',
  robots: { index: false, follow: false },
}

export default async function OrdersImportPage() {
  const catalog = await listOrderImportPickerCatalog()

  return (
    <>
      <AdminPageHeader
        title="Add / import orders"
        backHref="/admin/orders"
        backLabel="Back to orders"
      />
      <OrdersImportClient catalog={catalog} />
    </>
  )
}
