'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import type { StaffProfile } from '@/lib/auth/session'
import { AdminNav } from '@/components/admin/AdminNav'
import { AdminStaffProvider } from '@/components/admin/AdminStaffContext'

/**
 * Authenticated admin chrome — viewport-locked shell.
 * Sidebar stays put; only the content pane scrolls.
 */
export function AdminShell({
  profile,
  children,
}: {
  profile: StaffProfile
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const html = document.documentElement
    const { body } = document
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <AdminStaffProvider profile={profile}>
      <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-navy-deep">
        <div className="relative z-10 flex min-h-0 flex-1 lg:p-2 lg:pl-0">
          <AdminNav profile={profile} variant="desktop" />

          <div className="lg:hidden" aria-hidden={!mobileOpen}>
            <button
              type="button"
              tabIndex={mobileOpen ? 0 : -1}
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className={[
                'fixed inset-0 z-40 bg-ink/45 transition-opacity duration-200',
                mobileOpen
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0',
              ].join(' ')}
            />
            <AdminNav
              profile={profile}
              variant="mobile"
              isOpen={mobileOpen}
              onClose={() => setMobileOpen(false)}
            />
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper lg:rounded-xl lg:shadow-soft">
            <button
              type="button"
              className="absolute top-3 left-3 z-20 rounded-lg bg-white p-2 text-ink shadow-card lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-nav"
            >
              <Menu size={18} strokeWidth={2} />
            </button>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
              <main className="px-4 py-6 pt-14 lg:px-8 lg:py-8 lg:pt-8">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </AdminStaffProvider>
  )
}
