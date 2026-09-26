'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { whatsappHref } from '@/lib/brand'
import type { CategoryView, Product } from '@/lib/catalog/types'
import { ProductCard } from '@/components/ProductCard'
import { WhatsAppOrderVisual } from '@/components/WhatsAppOrderVisual'
import { HeroMediaBackground } from '@/components/website/HeroMediaBackground'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'
import type { HomePageContent } from '@/lib/website/types'

const heroUspIcons = [Truck, RefreshCw, BadgeCheck] as const
const trustIcons = [BadgeCheck, Truck, ShieldCheck, MessageCircle] as const

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

export function HomePage({
  content,
  categories,
  featured,
  foamPicks,
}: {
  content: HomePageContent
  categories: CategoryView[]
  featured: Product[]
  foamPicks: Product[]
}) {
  const { brand } = useSiteSettings()
  const { hero, sections } = content
  const waHref = whatsappHref(
    brand.whatsapp,
    `Hi ${brand.name}! I want to order footwear.`,
  )

  return (
    <>
      {sections.hero ? (
        <section className="relative min-h-[min(88svh,820px)] overflow-hidden bg-navy-deep">
          <div className="absolute inset-0">
            <HeroMediaBackground
              mode={hero.mediaMode}
              image={hero.image}
              video={hero.video}
              slides={hero.slides}
              slideIntervalMs={hero.slideIntervalMs}
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
                src={resolveSiteMediaUrl(hero.logoSrc, '/logo.png')}
                alt="Viable"
                className="h-[clamp(2.75rem,8vw,5rem)] w-auto max-w-full"
                width={332}
                height={81}
                decoding="async"
              />
              <h1 className="mt-5 text-[clamp(1.4rem,3.4vw,2rem)] font-medium leading-snug text-white/95 text-balance">
                {hero.headlineBefore}{' '}
                <em className="font-logo not-italic text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
                  {hero.headlineEm}
                </em>
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65 md:text-[16px]">
                {hero.subcopy}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={hero.primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full bg-spark px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-spark/25 transition hover:bg-spark-soft"
                >
                  {hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={hero.secondaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3.5 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
                >
                  {hero.secondaryCta.label}
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="absolute bottom-6 left-4 z-10 flex flex-row flex-wrap items-center gap-x-5 gap-y-2 sm:bottom-8 sm:left-6 md:gap-x-7 md:left-8 lg:left-10"
          >
            {hero.usps.map((label, i) => {
              const Icon = heroUspIcons[i % heroUspIcons.length]
              return (
                <li
                  key={`${label}-${i}`}
                  className="flex items-center gap-2.5 text-[13px] font-semibold text-white md:text-[14px] [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </li>
              )
            })}
          </motion.ul>
        </section>
      ) : null}

      {sections.categories ? (
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                {content.categories.title}
              </h2>
              <p className="mt-2 text-[14px] text-mute md:text-[15px]">
                {content.categories.subtitle}
              </p>
            </div>
            <Link
              href="/shop"
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
                  href={`/shop?category=${cat.slug}`}
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
                      {cat.count} {cat.count === 1 ? 'item' : 'items'}
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
      ) : null}

      {sections.promoDual ? (
        <section className="mx-auto max-w-7xl px-4 pb-4 md:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {([content.promoDual.left, content.promoDual.right] as const).map(
              (promo, index) => (
                <motion.article
                  key={promo.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="relative grid min-h-[200px] grid-cols-[1.15fr_0.85fr] items-stretch overflow-hidden rounded-[1.65rem] text-white md:min-h-[220px]"
                  style={{ backgroundColor: promo.bgColor }}
                >
                  <div className="z-10 flex flex-col justify-center px-5 py-5 md:px-7 md:py-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                      {promo.eyebrow}
                    </p>
                    <h2 className="mt-1.5 font-display text-[1.55rem] font-extrabold leading-tight tracking-tight md:text-[1.85rem]">
                      {promo.title}
                    </h2>
                    <Link
                      href={promo.cta.href}
                      className="mt-4 inline-flex w-fit rounded-full bg-cream px-4 py-2 text-[13px] font-semibold text-navy-deep transition hover:bg-white"
                    >
                      {promo.cta.label}
                    </Link>
                  </div>
                  <img
                    src={resolveSiteMediaUrl(promo.image)}
                    alt=""
                    className="h-full min-h-[180px] w-full object-cover object-center"
                  />
                </motion.article>
              ),
            )}
          </div>
        </section>
      ) : null}

      {sections.mostPopular ? (
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                {content.mostPopular.title}
              </h2>
              <p className="mt-2 text-[14px] text-mute md:text-[15px]">
                {content.mostPopular.subtitle}
              </p>
            </div>
            <Link
              href="/shop"
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
      ) : null}

      {sections.foamCrocs ? (
        <section className="bg-sand/80 py-14 md:py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                  {content.foamCrocs.title}
                </h2>
                <p className="mt-2 text-[14px] text-mute md:text-[15px]">
                  {content.foamCrocs.subtitle}
                </p>
              </div>
              <Link
                href="/shop?category=crocs"
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
      ) : null}

      {sections.saleBanner ? (
        <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[1.75rem] bg-navy-deep md:rounded-[2rem]"
          >
            <img
              src={resolveSiteMediaUrl(content.saleBanner.image)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep from-[0%] via-navy-deep/35 via-[42%] to-transparent to-[78%]" />
            <div className="relative flex min-h-[280px] flex-col justify-center px-8 py-12 md:min-h-[320px] md:px-14 lg:px-16">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-spark">
                {content.saleBanner.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-4xl font-extrabold text-white md:text-5xl">
                {content.saleBanner.title}
              </h2>
              <p className="mt-2 text-[16px] text-white/70">
                {content.saleBanner.bodyBefore}
                <span className="font-semibold text-spark">
                  {content.saleBanner.highlight}
                </span>
                {content.saleBanner.bodyAfter}
              </p>
              <Link
                href={content.saleBanner.cta.href}
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-ink transition hover:bg-sand"
              >
                {content.saleBanner.cta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p
              aria-hidden
              className="pointer-events-none absolute bottom-6 right-6 z-10 font-display text-[clamp(3rem,12vw,7rem)] font-extrabold leading-none text-spark/90 md:bottom-8 md:right-10"
            >
              {content.saleBanner.bigText}
            </p>
          </motion.div>
        </section>
      ) : null}

      {sections.whatsapp ? (
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
                {content.whatsapp.title}
              </h2>
              <p className="relative z-10 mt-1.5 max-w-md text-[0.95rem] leading-[1.55] text-white/80">
                {content.whatsapp.body}
              </p>
              <div className="relative z-10 mt-3.5 flex flex-wrap gap-2.5">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#22d664] px-[1.15rem] py-[0.7rem] text-[14px] font-extrabold text-[#0b3d1c] transition hover:bg-[#1ebe58]"
                >
                  <WhatsAppIcon className="h-[18px] w-[18px]" />
                  {content.whatsapp.primaryCtaLabel}
                </a>
                <Link
                  href={content.whatsapp.secondaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/45 px-[1.15rem] py-[0.7rem] text-[14px] font-extrabold text-white transition hover:bg-white/10"
                >
                  {content.whatsapp.secondaryCta.label}
                </Link>
              </div>
            </div>
          </motion.article>
        </section>
      ) : null}

      {sections.brandStrip ? (
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:gap-14 md:px-6 md:py-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-[1.5rem] shadow-card"
          >
            <img
              src={resolveSiteMediaUrl(content.brandStrip.image)}
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
              {content.brandStrip.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink text-balance md:text-4xl">
              {content.brandStrip.title}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]">
              {content.brandStrip.body}
            </p>
            <Link
              href={content.brandStrip.cta.href}
              className="mt-7 inline-flex items-center gap-2 text-[14px] font-semibold text-navy underline-offset-4 hover:underline"
            >
              {content.brandStrip.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </section>
      ) : null}

      {sections.trust ? (
        <section className="border-y border-cloud/80 bg-sand/70">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:gap-4 md:px-6 md:py-12 lg:px-8">
            {content.trust.map((item, i) => {
              const Icon = trustIcons[i % trustIcons.length]
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 md:justify-center"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-soft">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink md:text-[14px]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-mute md:text-[13px]">
                      {item.text}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </>
  )
}
