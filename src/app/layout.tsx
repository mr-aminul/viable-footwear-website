import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const inter = localFont({
  src: './fonts/Inter-latin-var.woff2',
  display: 'swap',
  variable: '--font-inter',
  weight: '100 900',
})

const bricolage = localFont({
  src: './fonts/BricolageGrotesque-latin-var.woff2',
  display: 'swap',
  variable: '--font-bricolage',
  weight: '200 800',
})

export const metadata: Metadata = {
  title: {
    default: 'Viable — Casual Footwear, Dhaka',
    template: '%s · Viable',
  },
  description:
    "Viable — Dhaka's go-to for casual, Gen Z footwear. Foam runners, crocs, slides & everyday kicks.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  verification: {
    other: {
      'facebook-domain-verification': 'a0tvppxvh9vnsnfxzuteii7vahc64a',
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${bricolage.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
