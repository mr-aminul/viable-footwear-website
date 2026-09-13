import type { Metadata } from 'next'
import { OrdersPage } from '@/components/pages/OrdersPage'

export const metadata: Metadata = {
  title: 'Your orders',
  description: 'Orders placed on this device.',
  robots: { index: false, follow: false },
}

export default function OrdersRoute() {
  return <OrdersPage />
}
