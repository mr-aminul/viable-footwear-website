'use client'

import Link from 'next/link'
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react'
import { whatsappHref } from '@/lib/brand'
import { BrandLogo } from '@/components/BrandLogo'
import { useSiteSettings } from '@/context/SiteSettingsContext'

const iconBtnClass =
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white/45 hover:bg-white/5'

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current`} strokeWidth="1.75">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Footer() {
  const { brand, footer } = useSiteSettings()
  const year = new Date().getFullYear()
  const copyright = footer.copyright.replaceAll('{year}', String(year))

  return (
    <footer className="mt-auto bg-navy-deep text-white">
      {/* Mobile — centered compact layout */}
      <div className="flex flex-col items-center px-5 py-10 text-center md:hidden">
        <BrandLogo variant="light" heightClassName="h-9" />

        <div className="mt-6 flex items-center gap-3">
          <a
            href={brand.facebook}
            target="_blank"
            rel="noreferrer"
            className={iconBtnClass}
            aria-label="Facebook"
          >
            <span className="text-[15px] font-semibold leading-none">f</span>
          </a>
          <a
            href={brand.instagram}
            target="_blank"
            rel="noreferrer"
            className={iconBtnClass}
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
          <a href={`tel:${brand.phone}`} className={iconBtnClass} aria-label="Call us">
            <Phone className="h-4 w-4" strokeWidth={1.75} />
          </a>
        </div>

        <nav className="mt-8 flex max-w-xs flex-wrap items-center justify-center gap-x-4 gap-y-2.5 text-[13px] text-white/85">
          <Link href="/shop" className="hover:text-white">
            Shop
          </Link>
          <Link href="/shop?sale=1" className="hover:text-white">
            Sale
          </Link>
          <Link href="/about" className="hover:text-white">
            Size guide
          </Link>
          <Link href="/about" className="hover:text-white">
            About us
          </Link>
          <a
            href={whatsappHref(brand.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            WhatsApp
          </a>
        </nav>

        <div className="mt-8 space-y-2.5 text-[13px] text-white/75">
          <a
            href={`tel:${brand.phone}`}
            className="flex items-center justify-center gap-2 hover:text-white"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {brand.phone}
          </a>
          <a
            href={`mailto:${brand.email}`}
            className="flex items-center justify-center gap-2 hover:text-white"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {brand.email}
          </a>
          <p className="flex items-center justify-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {brand.city}
          </p>
        </div>
      </div>

      {/* Desktop — multi-column layout */}
      <div className="mx-auto hidden max-w-7xl gap-10 px-4 py-14 md:grid md:grid-cols-2 md:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-16">
        <div className="lg:col-span-4">
          <BrandLogo variant="light" heightClassName="h-10" />
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/70">
            {footer.blurb}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={brand.instagram}
              target="_blank"
              rel="noreferrer"
              className={iconBtnClass}
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href={brand.facebook}
              target="_blank"
              rel="noreferrer"
              className={iconBtnClass}
              aria-label="Facebook"
            >
              <span className="text-[15px] font-semibold leading-none">f</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 lg:col-span-5">
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Shop
            </h4>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/75">
              <li>
                <Link href="/shop" className="hover:text-white">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop?category=crocs" className="hover:text-white">
                  Crocs
                </Link>
              </li>
              <li>
                <Link href="/shop?category=foam-runners" className="hover:text-white">
                  Foam Runners
                </Link>
              </li>
              <li>
                <Link href="/shop?sale=1" className="hover:text-white">
                  Sale
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Help
            </h4>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/75">
              <li>
                <a href={`tel:${brand.phone}`} className="hover:text-white">
                  Call us
                </a>
              </li>
              <li>
                <a
                  href={whatsappHref(brand.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${brand.email}`} className="hover:text-white">
                  Email
                </a>
              </li>
              <li>
                <Link href="/about" className="hover:text-white">
                  Size guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Company
            </h4>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/75">
              <li>
                <Link href="/about" className="hover:text-white">
                  About {brand.name}
                </Link>
              </li>
              <li>
                <a href={brand.facebook} className="hover:text-white">
                  Stores
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${brand.email}?subject=${encodeURIComponent(`Careers at ${brand.name}`)}`}
                  className="hover:text-white"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
            {footer.dropsTitle}
          </h4>
          <p className="mt-3 text-[14px] text-white/70">{footer.dropsBody}</p>
          <a
            href={whatsappHref(brand.whatsapp, footer.dropsPrefill)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-spark px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-spark-soft"
          >
            {footer.dropsCtaLabel}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-center text-[11px] text-white/45 md:flex-row md:items-center md:justify-between md:px-6 md:text-left md:text-[12px] lg:px-8">
          <p>{copyright}</p>
          <div className="hidden gap-5 md:flex">
            <Link href="/terms" className="hover:text-white/70">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white/70">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
