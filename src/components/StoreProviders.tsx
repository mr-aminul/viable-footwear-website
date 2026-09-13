'use client'

import { Suspense, type ReactNode } from 'react'
import { CartProvider } from '@/context/CartContext'
import { OrdersProvider } from '@/context/OrdersContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageTransition } from '@/components/PageTransition'
import { ToastHost } from '@/components/ToastHost'

export function StoreProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <OrdersProvider>
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <ToastHost />
      </OrdersProvider>
    </CartProvider>
  )
}
