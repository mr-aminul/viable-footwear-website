'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { BRAND } from '@/lib/brand'
import { BrandLogo } from '@/components/BrandLogo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/shop?category=crocs', label: 'Crocs' },
  { to: '/shop?category=sneakers', label: 'Sneakers' },
  { to: '/shop?category=slides', label: 'Slides' },
  { to: '/about', label: 'About' },
  { to: '/shop?sale=1', label: 'Sale', accent: true },
]

export function Header() {
  const { cartCount, wishlist } = useCart()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setOpen(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div className="bg-navy px-4 py-2 text-center text-[12px] font-medium tracking-wide text-white md:text-[13px]">
        Free delivery in Dhaka on orders over ৳3,000 · WhatsApp {BRAND.phone}
      </div>
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled
            ? 'border-cloud/70 bg-paper/90 shadow-soft backdrop-blur-md'
            : 'border-transparent bg-paper/95'
          }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[4.5rem] md:px-6 lg:px-8">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <BrandLogo />

          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <Link
                key={link.to + link.label}
                href={link.to}
                className={`text-[13px] font-medium tracking-wide transition hover:text-navy ${link.accent
                    ? 'text-spark hover:text-spark-soft'
                    : (pathname === link.to.split('?')[0] && (link.to.includes('?') ? searchParams.toString().includes(link.to.split('?')[1]) : !searchParams.toString()))
                      ? 'text-navy'
                      : 'text-ink/75'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 md:gap-1">
            <Link
              href="/shop"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist sm:flex"
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/shop"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist"
              aria-label="Wishlist"
            >
              <Heart className="h-[18px] w-[18px]" />
              {wishlist.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-spark px-1 text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist"
              aria-label="Cart"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/admin/login"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist md:flex"
              aria-label="Staff account"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[70] flex w-[min(88vw,320px)] flex-col bg-white shadow-lift lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="flex items-center justify-between border-b border-cloud px-5 py-4">
                <BrandLogo heightClassName="h-7" />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-mist"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                {links.map((link) => (
                  <Link
                    key={link.to + link.label}
                    href={link.to}
                    className={`rounded-xl px-4 py-3 text-[15px] font-medium ${link.accent ? 'text-spark' : 'text-ink'
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
