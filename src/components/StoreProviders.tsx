'use client'

import { Suspense, type ReactNode } from 'react'
import { CartProvider } from '@/context/CartContext'
import { OrdersProvider } from '@/context/OrdersContext'
import { SiteSettingsProvider } from '@/context/SiteSettingsContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageTransition } from '@/components/PageTransition'
import { ToastHost } from '@/components/ToastHost'
import type { SiteContent } from '@/lib/website/types'

export function StoreProviders({
  children,
  announcement,
  site,
}: {
  children: ReactNode
  announcement?: string | null
  site: SiteContent
}) {
  return (
    <SiteSettingsProvider value={site}>
      <CartProvider>
        <OrdersProvider>
          <Suspense fallback={null}>
            <Header announcement={announcement} />
          </Suspense>
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
          <ToastHost />
        </OrdersProvider>
      </CartProvider>
    </SiteSettingsProvider>
  )
}
