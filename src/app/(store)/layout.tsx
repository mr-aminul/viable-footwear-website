'use client'

import { Suspense } from 'react'
import { CartProvider } from '@/context/CartContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </CartProvider>
  )
}
