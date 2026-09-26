import Link from 'next/link'
import { getSiteContent } from '@/lib/website/queries'

export const metadata = {
  title: 'Terms of use',
  robots: { index: true, follow: true },
}

export default async function TermsPage() {
  const { brand } = await getSiteContent()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20 lg:px-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        Terms of use
      </h1>
      <p className="mt-3 text-[14px] text-mute">
        Last updated {new Date().getFullYear()}. These terms apply to shopping
        on the {brand.name} storefront.
      </p>
      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-ink/90">
        <section>
          <h2 className="text-[16px] font-semibold">Orders & payment</h2>
          <p className="mt-2 text-mute">
            Placing an order is an offer to buy. We may decline or cancel orders
            for stock, pricing, or fraud reasons. Cash on delivery and supported
            digital wallets are accepted when enabled at checkout.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Delivery</h2>
          <p className="mt-2 text-mute">
            Delivery fees are calculated at checkout (including Pathao rates and
            any active campaign). Timing estimates are not guarantees.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Returns</h2>
          <p className="mt-2 text-mute">
            Unused pairs may be returned within 7 days subject to our exchange /
            return policy shared at checkout and on product pages. Contact{' '}
            <a className="text-navy underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>{' '}
            or WhatsApp {brand.phone}.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Contact</h2>
          <p className="mt-2 text-mute">
            {brand.name} · {brand.city} · {brand.email} · {brand.phone}
          </p>
        </section>
      </div>
      <Link
        href="/shop"
        className="mt-12 inline-flex text-[14px] font-semibold text-navy hover:underline"
      >
        Back to shop
      </Link>
    </div>
  )
}
