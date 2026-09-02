import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { BRAND } from '../data/products'
import { BrandLogo } from './BrandLogo'

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-16">
        <div className="lg:col-span-4">
          <BrandLogo variant="light" heightClassName="h-9 md:h-10" />
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/70">
            Casual footwear for Dhaka&apos;s Gen Z. Foam runners, crocs, slides
            and everyday kicks — designed to move with you.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition hover:border-white/40 hover:bg-white/5"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.75">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href={BRAND.facebook}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[13px] font-semibold transition hover:border-white/40 hover:bg-white/5"
              aria-label="Facebook"
            >
              f
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Shop
            </h4>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/75">
              <li>
                <Link to="/shop" className="hover:text-white">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?category=crocs" className="hover:text-white">
                  Crocs
                </Link>
              </li>
              <li>
                <Link to="/shop?category=foam-runners" className="hover:text-white">
                  Foam Runners
                </Link>
              </li>
              <li>
                <Link to="/shop?sale=1" className="hover:text-white">
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
                <a href={`tel:${BRAND.phone}`} className="hover:text-white">
                  Call us
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${BRAND.email}`} className="hover:text-white">
                  Email
                </a>
              </li>
              <li>
                <Link to="/about" className="hover:text-white">
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
                <Link to="/about" className="hover:text-white">
                  About Viable
                </Link>
              </li>
              <li>
                <a href={BRAND.facebook} className="hover:text-white">
                  Stores
                </a>
              </li>
              <li>
                <span className="text-white/50">Careers</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Newsletter
          </h4>
          <p className="mt-3 text-[14px] text-white/70">
            Drops, restocks & early sale access.
          </p>
          <form
            className="mt-4 flex overflow-hidden rounded-full border border-white/15 bg-white/5 focus-within:border-white/35"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="Your email"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-spark text-white transition hover:bg-spark-soft"
              aria-label="Subscribe"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[12px] text-white/45 sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Viable. {BRAND.city}</p>
          <div className="flex gap-5">
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
