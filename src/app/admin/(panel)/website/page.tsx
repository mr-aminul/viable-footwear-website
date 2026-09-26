import Link from 'next/link'
import { ArrowRight, FileText, Home, Settings2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/ui'

const pages = [
  {
    key: 'home',
    href: '/admin/website/home',
    title: 'Home',
    description:
      'Hero (image, video, or slideshow), promo banners, sale strip, WhatsApp block, brand story, and trust copy.',
    icon: Home,
    preview: '/',
  },
  {
    key: 'about',
    href: '/admin/website/about',
    title: 'About',
    description:
      'About hero media, story copy, stats, size-guide headings, and contact section title.',
    icon: FileText,
    preview: '/about',
  },
  {
    key: 'site',
    href: '/admin/website/site',
    title: 'Site settings',
    description:
      'Phone, WhatsApp, email, socials, footer copy, and product-page delivery / returns / authenticity promises.',
    icon: Settings2,
    preview: '/',
  },
] as const

export const metadata = {
  title: 'Website Modifier',
  robots: { index: false, follow: false },
}

export default function WebsiteModifierPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Website Modifier"
        description="Edit storefront pages the way shoppers see them — change images, video, slideshows, and copy without touching code."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => {
          const Icon = page.icon
          return (
            <Link
              key={page.key}
              href={page.href}
              className="group flex flex-col rounded-2xl border border-cloud bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <ArrowRight
                  size={16}
                  className="text-mute transition group-hover:translate-x-0.5 group-hover:text-navy"
                />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">
                {page.title}
              </h2>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-mute">
                {page.description}
              </p>
              <p className="mt-5 text-[12px] font-semibold text-navy">
                Open editor →
              </p>
            </Link>
          )
        })}
      </div>

      <p className="text-[13px] text-mute">
        Product photos, prices, and stock still live under{' '}
        <Link href="/admin/catalog" className="font-semibold text-navy hover:underline">
          Products
        </Link>
        . Delivery promotions for the top ribbon live under{' '}
        <Link href="/admin/campaigns" className="font-semibold text-navy hover:underline">
          Campaigns
        </Link>
        .
      </p>
    </div>
  )
}
