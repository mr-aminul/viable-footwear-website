import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Phone } from 'lucide-react'
import { BRAND } from '../data/products'

const sizeRows = [
  { eu: '36–37', us: '5–6', cm: '22.5–23.5' },
  { eu: '38–39', us: '7–8', cm: '24–25' },
  { eu: '40–41', us: '8.5–9.5', cm: '25.5–26.5' },
  { eu: '42–43', us: '10–11', cm: '27–28' },
  { eu: '44–45', us: '11.5–12.5', cm: '28.5–29.5' },
]

export function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy-deep">
        <img
          src="/images/store.jpg"
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
              About us
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight text-white">
              Footwear that keeps up with Dhaka
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-white/70">
              Viable is a casual footwear brand for Gen Z — foam runners, crocs,
              slides and everyday sneakers. Soft underfoot. Sharp on the street.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:gap-16 md:px-6 md:py-24 lg:px-8">
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Who we are
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]">
            Based in {BRAND.city}, Viable exists for people who want comfort
            without compromising style. We skip formal leather and dress shoes —
            our racks are filled with sculptural foam, chunky sneakers, and
            easy slides you&apos;ll actually wear every day.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]">
            With {BRAND.followers}+ followers on Facebook and a {BRAND.recommend}{' '}
            recommend rate from real customers, we&apos;ve become a go-to stop
            for campus, café, and city-street fits.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: BRAND.followers, label: 'Facebook followers' },
            { value: BRAND.recommend, label: 'Would recommend' },
            { value: '100%', label: 'Casual & lifestyle' },
            { value: '7-day', label: 'Easy exchange' },
          ].map((stat) => (
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
            Size guide
          </h2>
          <p className="mt-2 text-[14px] text-mute">
            Approximate conversions. Foam styles run true to size — when in
            doubt, size up.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <thead className="border-b border-cloud bg-mist/50 text-[12px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">EU</th>
                  <th className="px-5 py-3.5 font-semibold">US</th>
                  <th className="px-5 py-3.5 font-semibold">CM</th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map((row) => (
                  <tr key={row.eu} className="border-b border-cloud last:border-0">
                    <td className="px-5 py-3.5 font-medium">{row.eu}</td>
                    <td className="px-5 py-3.5 text-mute">{row.us}</td>
                    <td className="px-5 py-3.5 text-mute">{row.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
        <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Get in touch
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <a
            href={`tel:${BRAND.phone}`}
            className="flex items-start gap-3 rounded-2xl border border-cloud p-5 transition hover:border-navy/25"
          >
            <Phone className="mt-0.5 h-5 w-5 text-navy" />
            <div>
              <p className="text-[14px] font-semibold">Call / WhatsApp</p>
              <p className="mt-1 text-[13px] text-mute">{BRAND.phone}</p>
            </div>
          </a>
          <a
            href={`mailto:${BRAND.email}`}
            className="flex items-start gap-3 rounded-2xl border border-cloud p-5 transition hover:border-navy/25"
          >
            <Mail className="mt-0.5 h-5 w-5 text-navy" />
            <div>
              <p className="text-[14px] font-semibold">Email</p>
              <p className="mt-1 text-[13px] text-mute">{BRAND.email}</p>
            </div>
          </a>
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-2xl border border-cloud p-5 transition hover:border-navy/25"
          >
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 fill-none stroke-navy" strokeWidth="1.75">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" className="fill-navy" />
            </svg>
            <div>
              <p className="text-[14px] font-semibold">Instagram</p>
              <p className="mt-1 text-[13px] text-mute">@viable.bd</p>
            </div>
          </a>
        </div>
        <Link
          to="/shop"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
        >
          Shop the collection
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  )
}
