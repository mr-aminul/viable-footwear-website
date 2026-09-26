'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Phone } from 'lucide-react'
import { SIZE_CHART_ROWS } from '@/lib/catalog/size-chart'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'
import type { AboutPageContent } from '@/lib/website/types'

export function AboutPage({ content }: { content: AboutPageContent }) {
  const { brand } = useSiteSettings()
  return (
    <>
      <section className="relative overflow-hidden bg-navy-deep">
        <img
          src={resolveSiteMediaUrl(content.hero.image, '/images/store.jpg')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/70 to-navy-deep/50" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:px-6 md:py-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-spark">
              {content.hero.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight text-white">
              {content.hero.title}
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-white/70">
              {content.hero.subcopy}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:gap-16 md:px-6 md:py-24 lg:px-8">
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            {content.whoWeAre.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]">
            {content.whoWeAre.body1}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]">
            {content.whoWeAre.body2}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {content.whoWeAre.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-mist/80 px-5 py-6"
            >
              <p className="font-display text-3xl font-extrabold text-navy md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[13px] text-mute">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand/70 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            {content.sizeGuide.title}
          </h2>
          <p className="mt-2 text-[14px] text-mute">
            {content.sizeGuide.subtitle}
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <thead className="border-b border-cloud bg-mist/50 text-[12px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">EU</th>
                  <th className="px-5 py-3.5 font-semibold">Length from (mm)</th>
                  <th className="px-5 py-3.5 font-semibold">Length until (mm)</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART_ROWS.map((row) => (
                  <tr key={row.eu} className="border-b border-cloud last:border-0">
                    <td className="px-5 py-3.5 font-medium">{row.eu}</td>
                    <td className="px-5 py-3.5 text-mute">{row.lengthFromMm}</td>
                    <td className="px-5 py-3.5 text-mute">{row.lengthUntilMm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
        <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          {content.contact.title}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <a
            href={`tel:${brand.phone}`}
            className="flex items-start gap-3 rounded-2xl border border-cloud p-5 transition hover:border-navy/25"
          >
            <Phone className="mt-0.5 h-5 w-5 text-navy" />
            <div>
              <p className="text-[14px] font-semibold">Call / WhatsApp</p>
              <p className="mt-1 text-[13px] text-mute">{brand.phone}</p>
            </div>
          </a>
          <a
            href={`mailto:${brand.email}`}
            className="flex items-start gap-3 rounded-2xl border border-cloud p-5 transition hover:border-navy/25"
          >
            <Mail className="mt-0.5 h-5 w-5 text-navy" />
            <div>
              <p className="text-[14px] font-semibold">Email</p>
              <p className="mt-1 text-[13px] text-mute">{brand.email}</p>
            </div>
          </a>
          <a
            href={brand.instagram}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-2xl border border-cloud p-5 transition hover:border-navy/25"
          >
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-5 w-5 fill-none stroke-navy"
              strokeWidth="1.75"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
                className="fill-navy"
              />
            </svg>
            <div>
              <p className="text-[14px] font-semibold">Instagram</p>
              <p className="mt-1 text-[13px] text-mute">{brand.instagramHandle}</p>
            </div>
          </a>
        </div>
        <Link
          href="/shop"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
        >
          Shop the collection
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  )
}
