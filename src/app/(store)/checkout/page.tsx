import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CheckoutPage } from '@/components/pages/CheckoutPage'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Viable Footwear order with COD or bKash.',
  robots: { index: false, follow: false },
}

export default function CheckoutRoute() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-24 text-center text-mute md:px-6">
          Loading checkout…
        </div>
      }
    >
      <CheckoutPage />
    </Suspense>
  )
}
