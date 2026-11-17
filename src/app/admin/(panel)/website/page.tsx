import Link from 'next/link'
import { ArrowRight, FileText, Home, ImageIcon, Settings2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/ui'

const pages = [
  {
    key: 'home',
    href: '/admin/website/home',
    title: 'Home',
    icon: Home,
  },
  {
    key: 'about',
    href: '/admin/website/about',
    title: 'About',
    icon: FileText,
  },
  {
    key: 'popup',
    href: '/admin/website/popup',
    title: 'Marketing popup',
    icon: ImageIcon,
  },
  {
    key: 'site',
    href: '/admin/website/site',
    title: 'Site settings',
    icon: Settings2,
  },
] as const

export const metadata = {
  title: 'Website Modifier',
  robots: { index: false, follow: false },
}

export default function WebsiteModifierPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Website Modifier" />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {pages.map((page) => {
          const Icon = page.icon
          return (
            <Link
              key={page.key}
              href={page.href}
              className="group flex items-center gap-3 rounded-2xl border border-cloud bg-white p-4 transition hover:border-navy/25"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 font-display text-lg font-extrabold tracking-tight text-ink">
                {page.title}
              </span>
              <ArrowRight
                size={14}
                className="shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:text-navy"
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
