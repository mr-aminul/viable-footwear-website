import type { Metadata } from 'next'
import { CheckoutPage } from '@/components/pages/CheckoutPage'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Viable Footwear order with cash on delivery.',
  robots: { index: false, follow: false },
}

export default function CheckoutRoute() {
  return <CheckoutPage />
}
