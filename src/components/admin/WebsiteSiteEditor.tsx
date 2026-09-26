'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  Field,
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'
import { saveSiteContent } from '@/lib/website/actions'
import type { SiteContent } from '@/lib/website/types'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-cloud bg-white p-5 shadow-soft md:p-6">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-[13px] text-mute">{description}</p>
      ) : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

export function WebsiteSiteEditor({ initial }: { initial: SiteContent }) {
  const [content, setContent] = useState(initial)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initial),
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isDirty = JSON.stringify(content) !== savedSnapshot

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const setBrand = <K extends keyof SiteContent['brand']>(
    key: K,
    value: SiteContent['brand'][K],
  ) => {
    setContent((prev) => ({
      ...prev,
      brand: { ...prev.brand, [key]: value },
    }))
  }

  const setFooter = <K extends keyof SiteContent['footer']>(
    key: K,
    value: SiteContent['footer'][K],
  ) => {
    setContent((prev) => ({
      ...prev,
      footer: { ...prev.footer, [key]: value },
    }))
  }

  const setPromise = <K extends keyof SiteContent['productPromises']>(
    key: K,
    value: SiteContent['productPromises'][K],
  ) => {
    setContent((prev) => ({
      ...prev,
      productPromises: { ...prev.productPromises, [key]: value },
    }))
  }

  const onSave = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await saveSiteContent(content)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSavedSnapshot(JSON.stringify(content))
      setSuccess('Site settings saved. Storefront will pick these up shortly.')
    })
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-cloud bg-paper/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/website"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white transition hover:bg-navy-deep"
            aria-label="Back to Website Modifier"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="text-[14px] font-semibold text-ink">Site settings</p>
            <p className="text-[12px] text-mute">
              Brand contact, footer, and product promises
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
              Unsaved changes
            </span>
          ) : null}
          <AdminActionButton onClick={onSave} disabled={pending || !isDirty}>
            {pending ? 'Saving…' : 'Save settings'}
          </AdminActionButton>
        </div>
      </div>

      <FormError message={error} />
      <FormSuccess message={success} />

      <Section
        title="Brand & contact"
        description="Used in the footer, About contact cards, WhatsApp links, campaign ribbon, and legal pages."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name">
            <input
              className={softFieldClassName}
              value={content.brand.name}
              onChange={(e) => setBrand('name', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Tagline">
            <input
              className={softFieldClassName}
              value={content.brand.tagline}
              onChange={(e) => setBrand('tagline', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Phone (display)">
            <input
              className={softFieldClassName}
              value={content.brand.phone}
              onChange={(e) => setBrand('phone', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field
            label="WhatsApp number"
            hint="Include country code, e.g. +8801805215181"
          >
            <input
              className={softFieldClassName}
              value={content.brand.whatsapp}
              onChange={(e) => setBrand('whatsapp', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Email">
            <input
              className={softFieldClassName}
              value={content.brand.email}
              onChange={(e) => setBrand('email', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="City / location">
            <input
              className={softFieldClassName}
              value={content.brand.city}
              onChange={(e) => setBrand('city', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Instagram URL">
            <input
              className={softFieldClassName}
              value={content.brand.instagram}
              onChange={(e) => setBrand('instagram', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Instagram handle (display)">
            <input
              className={softFieldClassName}
              value={content.brand.instagramHandle}
              onChange={(e) => setBrand('instagramHandle', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Facebook URL">
            <input
              className={softFieldClassName}
              value={content.brand.facebook}
              onChange={(e) => setBrand('facebook', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Followers (stat)">
            <input
              className={softFieldClassName}
              value={content.brand.followers}
              onChange={(e) => setBrand('followers', e.target.value)}
              disabled={pending}
              placeholder="22K"
            />
          </Field>
          <Field label="Recommend rate (stat)">
            <input
              className={softFieldClassName}
              value={content.brand.recommend}
              onChange={(e) => setBrand('recommend', e.target.value)}
              disabled={pending}
              placeholder="96%"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Footer"
        description="Desktop blurb, drops CTA, and copyright line. Use {year} for the current year."
      >
        <Field label="Brand blurb">
          <textarea
            className={`${softFieldClassName} min-h-[88px]`}
            value={content.footer.blurb}
            onChange={(e) => setFooter('blurb', e.target.value)}
            disabled={pending}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Drops title">
            <input
              className={softFieldClassName}
              value={content.footer.dropsTitle}
              onChange={(e) => setFooter('dropsTitle', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Drops CTA label">
            <input
              className={softFieldClassName}
              value={content.footer.dropsCtaLabel}
              onChange={(e) => setFooter('dropsCtaLabel', e.target.value)}
              disabled={pending}
            />
          </Field>
        </div>
        <Field label="Drops body">
          <textarea
            className={`${softFieldClassName} min-h-[72px]`}
            value={content.footer.dropsBody}
            onChange={(e) => setFooter('dropsBody', e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field
          label="WhatsApp prefill message"
          hint="Sent when shoppers tap the drops CTA."
        >
          <input
            className={softFieldClassName}
            value={content.footer.dropsPrefill}
            onChange={(e) => setFooter('dropsPrefill', e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Copyright line">
          <input
            className={softFieldClassName}
            value={content.footer.copyright}
            onChange={(e) => setFooter('copyright', e.target.value)}
            disabled={pending}
          />
        </Field>
      </Section>

      <Section
        title="Product page promises"
        description="Shown under Add to bag on every product page."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivery label">
            <input
              className={softFieldClassName}
              value={content.productPromises.deliveryLabel}
              onChange={(e) => setPromise('deliveryLabel', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Delivery text">
            <input
              className={softFieldClassName}
              value={content.productPromises.deliveryText}
              onChange={(e) => setPromise('deliveryText', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Returns label">
            <input
              className={softFieldClassName}
              value={content.productPromises.returnsLabel}
              onChange={(e) => setPromise('returnsLabel', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Returns text">
            <input
              className={softFieldClassName}
              value={content.productPromises.returnsText}
              onChange={(e) => setPromise('returnsText', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Authentic label">
            <input
              className={softFieldClassName}
              value={content.productPromises.authenticLabel}
              onChange={(e) => setPromise('authenticLabel', e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Authentic text">
            <input
              className={softFieldClassName}
              value={content.productPromises.authenticText}
              onChange={(e) => setPromise('authenticText', e.target.value)}
              disabled={pending}
            />
          </Field>
        </div>
      </Section>
    </div>
  )
}
