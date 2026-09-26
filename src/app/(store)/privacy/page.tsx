import Link from 'next/link'
import { getSiteContent } from '@/lib/website/queries'

export const metadata = {
  title: 'Privacy',
  robots: { index: true, follow: true },
}

export default async function PrivacyPage() {
  const { brand } = await getSiteContent()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20 lg:px-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        Privacy
      </h1>
      <p className="mt-3 text-[14px] text-mute">
        How {brand.name} handles information when you shop with us.
      </p>
      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-ink/90">
        <section>
          <h2 className="text-[16px] font-semibold">What we collect</h2>
          <p className="mt-2 text-mute">
            Checkout details you provide (name, phone, address, optional email),
            order history, and technical logs needed to run the site. Wishlist
            data is stored only in your browser on this device.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">How we use it</h2>
          <p className="mt-2 text-mute">
            To fulfil orders, arrange delivery (including courier partners),
            prevent fraud, and improve the storefront. Marketing tags (GTM /
            Meta) only run when enabled by the store.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Sharing</h2>
          <p className="mt-2 text-mute">
            We share fulfilment data with logistics and payment providers as
            needed to complete your order. We do not sell your personal data.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Contact</h2>
          <p className="mt-2 text-mute">
            Questions:{' '}
            <a className="text-navy underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
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
