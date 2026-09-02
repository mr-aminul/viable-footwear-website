import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import {
  BRAND,
  categories,
  products,
} from '../data/products'
import { ProductCard } from '../components/ProductCard'
import { WhatsAppOrderVisual } from '../components/WhatsAppOrderVisual'

const featured = products.filter((p) => p.featured).slice(0, 4)
const foamPicks = products
  .filter((p) => p.category === 'crocs' || p.category === 'foam-runners' || p.category === 'slides')
  .slice(0, 4)

const heroUsps = [
  { icon: Truck, label: 'Countrywide Delivery' },
  { icon: RefreshCw, label: 'Easy returns' },
  { icon: BadgeCheck, label: 'COD available' },
]

const trust = [
  { icon: BadgeCheck, title: '100% Authentic', text: 'Direct from Viable' },
  { icon: Truck, title: 'Fast Delivery', text: 'Across greater Dhaka' },
  { icon: ShieldCheck, title: 'Secure Pay', text: 'bKash · Nagad · Card' },
  { icon: MessageCircle, title: 'WhatsApp Order', text: BRAND.phone },
]

const waHref = `https://wa.me/${BRAND.whatsapp.replace('+', '')}?text=${encodeURIComponent(
  'Hi Viable! I want to order footwear.',
)}`

/** Official-style WhatsApp glyph (filled). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[min(88svh,820px)] overflow-hidden bg-navy-deep">
        <div className="absolute inset-0">
          <img
            src="/images/hero.png"
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/92 via-navy-deep/58 to-navy-deep/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/75 via-transparent to-navy-deep/25" />
          <div className="grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay" />
        </div>

        <div className="relative mx-auto flex min-h-[min(88svh,820px)] max-w-7xl flex-col justify-end px-4 pb-28 pt-28 md:justify-center md:px-6 md:pb-28 md:pt-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            <img
              src="/logo.png"
              alt="Viable"
              className="h-[clamp(2.75rem,8vw,5rem)] w-auto max-w-full"
              width={332}
              height={81}
              decoding="async"
            />
            <h1 className="mt-5 text-[clamp(1.4rem,3.4vw,2rem)] font-medium leading-snug text-white/95 text-balance">
              Step into{' '}
              <em className="font-logo not-italic text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
                everyday greatness
              </em>
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65 md:text-[16px]">
              Casual foam, crocs & kicks made for Dhaka&apos;s Gen Z — light,
              loud, and built to live in.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-spark px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-spark/25 transition hover:bg-spark-soft"
              >
                Shop now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop?category=crocs"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3.5 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
              >
                Explore crocs
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Hero USPs — bottom right over image */}
        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="absolute bottom-6 left-4 z-10 flex flex-row flex-wrap items-center gap-x-5 gap-y-2 sm:bottom-8 sm:left-6 md:gap-x-7 md:left-8 lg:left-10"
        >
          {heroUsps.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 text-[13px] font-semibold text-white md:text-[14px] [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {label}
            </li>
          ))}
        </motion.ul>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              Shop by category
            </h2>
            <p className="mt-2 text-[14px] text-mute md:text-[15px]">
              The silhouettes Dhaka lives in.
            </p>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy-deep sm:inline-flex"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
            >
              <Link
                to={`/shop?category=${cat.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-[1.15rem] bg-white text-center shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="flex aspect-square w-full items-center justify-center overflow-hidden">
                  <img
                    src={cat.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </span>
                <div className="flex flex-col items-center px-3 pb-3.5 pt-1">
                  <h3 className="text-[14px] font-semibold tracking-tight text-ink">
                    {cat.name}
                  </h3>
                  <p className="text-[12px] font-medium text-mute">
                    {cat.count}+ items
                  </p>
                  <span className="mt-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-navy transition group-hover:bg-navy group-hover:text-white">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Dual promo banners */}
      <section className="mx-auto max-w-7xl px-4 pb-4 md:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative grid min-h-[200px] grid-cols-[1.15fr_0.85fr] items-stretch overflow-hidden rounded-[1.65rem] text-white md:min-h-[220px]"
            style={{ backgroundColor: '#0f2248' }}
          >
            <div className="z-10 flex flex-col justify-center px-5 py-5 md:px-7 md:py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                New arrivals
              </p>
              <h2 className="mt-1.5 font-display text-[1.55rem] font-extrabold leading-tight tracking-tight md:text-[1.85rem]">
                Fresh picks for everyday feet
              </h2>
              <Link
                to="/shop"
                className="mt-4 inline-flex w-fit rounded-full bg-cream px-4 py-2 text-[13px] font-semibold text-navy-deep transition hover:bg-white"
              >
                Shop now
              </Link>
            </div>
            <img
              src="/images/promos/promo-croc-navy.png"
              alt=""
              className="h-full min-h-[180px] w-full object-cover object-center"
            />
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="relative grid min-h-[200px] grid-cols-[1.15fr_0.85fr] items-stretch overflow-hidden rounded-[1.65rem] text-white md:min-h-[220px]"
            style={{ backgroundColor: '#e31c23' }}
          >
            <div className="z-10 flex flex-col justify-center px-5 py-5 md:px-7 md:py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
                Street energy
              </p>
              <h2 className="mt-1.5 font-display text-[1.55rem] font-extrabold leading-tight tracking-tight md:text-[1.85rem]">
                Sneakers made to be seen
              </h2>
              <Link
                to="/shop?category=sneakers"
                className="mt-4 inline-flex w-fit rounded-full bg-cream px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-white"
              >
                Shop sneakers
              </Link>
            </div>
            <img
              src="/images/promos/promo-sneaker-red.png"
              alt=""
              className="h-full min-h-[180px] w-full object-cover object-center"
            />
          </motion.article>
        </div>
      </section>

      {/* Best sellers */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              Most popular
            </h2>
            <p className="mt-2 text-[14px] text-mute md:text-[15px]">
              What everyone&apos;s wearing right now.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy-deep"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      {/* Crocs rail */}
      <section className="bg-sand/80 py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                Foam & crocs
              </h2>
              <p className="mt-2 text-[14px] text-mute md:text-[15px]">
                Sculptural comfort for all-day Dhaka walks.
              </p>
            </div>
            <Link
              to="/shop?category=crocs"
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy-deep"
            >
              See all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {foamPicks.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Autumn / limited drop */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[1.75rem] bg-navy-deep md:rounded-[2rem]"
        >
          <img
            src="/images/promo-autumn.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep from-[0%] via-navy-deep/35 via-[42%] to-transparent to-[78%]" />
          <div className="relative flex min-h-[280px] flex-col justify-center px-8 py-12 md:min-h-[320px] md:px-14 lg:px-16">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-spark">
              Limited drop
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold text-white md:text-5xl">
              Autumn Sale
            </h2>
            <p className="mt-2 text-[16px] text-white/70">
              Up to <span className="font-semibold text-spark">40% off</span> select
              foam & crocs
            </p>
            <Link
              to="/shop?sale=1"
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-ink transition hover:bg-sand"
            >
              Shop the sale
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p
            aria-hidden
            className="pointer-events-none absolute bottom-6 right-6 z-10 font-display text-[clamp(3rem,12vw,7rem)] font-extrabold leading-none text-spark/90 md:bottom-8 md:right-10"
          >
            40%
          </p>
        </motion.div>
      </section>

      {/* WhatsApp order */}
      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid overflow-hidden rounded-[2rem] bg-[#1b4332] text-white md:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="relative min-h-[220px] w-full self-stretch">
            <div className="absolute inset-0">
              <WhatsAppOrderVisual />
            </div>
          </div>
          <div className="relative isolate overflow-hidden px-5 py-6 md:px-6 md:py-8 md:pr-7 md:pl-5">
            <WhatsAppIcon className="pointer-events-none absolute -right-5 -top-7 z-0 w-[min(11.25rem,42%)] rotate-12 text-[#22d664] opacity-[0.18] max-md:right-1 max-md:-top-2 max-md:w-[min(6.25rem,30%)] max-md:opacity-[0.14]" />
            <h2 className="relative z-10 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold tracking-tight">
              Order on WhatsApp
            </h2>
            <p className="relative z-10 mt-1.5 max-w-md text-[0.95rem] leading-[1.55] text-white/80">
              Send us your size and style — we&apos;ll confirm stock, quote
              delivery, and take your order in minutes.
            </p>
            <div className="relative z-10 mt-3.5 flex flex-wrap gap-2.5">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#22d664] px-[1.15rem] py-[0.7rem] text-[14px] font-extrabold text-[#0b3d1c] transition hover:bg-[#1ebe58]"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                WhatsApp to order
              </a>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/45 px-[1.15rem] py-[0.7rem] text-[14px] font-extrabold text-white transition hover:bg-white/10"
              >
                Browse the shop
              </Link>
            </div>
          </div>
        </motion.article>
      </section>

      {/* Store / brand strip */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:gap-14 md:px-6 md:py-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-[1.5rem] shadow-card"
        >
          <img
            src="/images/hero.png"
            alt="Viable footwear lifestyle"
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-navy">
            Our space
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink text-balance md:text-4xl">
            Built for the way you actually walk
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]">
            No formal leather. No stiff dress shoes. Just soft foam, sculptural
            crocs, slides and street sneakers — curated for Bangladesh&apos;s
            most style-forward crowd. Trusted by {BRAND.followers}+ on Facebook
            with a {BRAND.recommend} recommend rate.
          </p>
          <Link
            to="/about"
            className="mt-7 inline-flex items-center gap-2 text-[14px] font-semibold text-navy underline-offset-4 hover:underline"
          >
            Our story
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* Trust */}
      <section className="border-y border-cloud/80 bg-sand/70">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:gap-4 md:px-6 md:py-12 lg:px-8">
          {trust.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 md:justify-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-soft">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink md:text-[14px]">
                  {title}
                </p>
                <p className="mt-0.5 text-[12px] text-mute md:text-[13px]">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
