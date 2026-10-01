'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImageIcon } from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import {
  Field,
  FormError,
  FormSuccess,
  softFieldClassName,
} from '@/components/admin/ui'
import { SiteMediaPicker } from '@/components/website/SiteMediaPicker'
import { saveSiteContent } from '@/lib/website/actions'
import {
  MARKETING_POPUP_DELAY_MAX,
  MARKETING_POPUP_DELAY_MIN,
} from '@/lib/website/constants'
import {
  fromDatetimeLocalValue,
  normalizeSiteHref,
  toDatetimeLocalValue,
} from '@/lib/website/marketing-popup'
import type {
  MarketingPopupFrequency,
  SiteContent,
} from '@/lib/website/types'

function newCampaignKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  return String(Date.now())
}

export function WebsitePopupEditor({
  initial,
}: {
  initial: SiteContent
}) {
  const [content, setContent] = useState(initial)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initial),
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const popup = content.marketingPopup
  const isDirty = JSON.stringify(content) !== savedSnapshot

  const setPopup = <K extends keyof SiteContent['marketingPopup']>(
    key: K,
    value: SiteContent['marketingPopup'][K],
  ) => {
    setContent((prev) => ({
      ...prev,
      marketingPopup: { ...prev.marketingPopup, [key]: value },
    }))
  }

  const onImageChange = (path: string) => {
    setContent((prev) => ({
      ...prev,
      marketingPopup: {
        ...prev.marketingPopup,
        image: path,
        // New creative → reset dismiss so returning shoppers see it.
        campaignKey: newCampaignKey(),
      },
    }))
  }

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)

    if (content.marketingPopup.enabled && !content.marketingPopup.image.trim()) {
      setError('Upload a marketing image before enabling the popup.')
      return false
    }

    const result = await saveSiteContent(content)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setSavedSnapshot(JSON.stringify(content))
    setSuccess(
      content.marketingPopup.enabled
        ? 'Popup saved. It will appear on the storefront after the delay you set.'
        : 'Popup settings saved. The popup is currently off.',
    )
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  const onSave = () => {
    startTransition(async () => {
      await performSave()
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
            <p className="text-[14px] font-semibold text-ink">Marketing popup</p>
            <p className="text-[12px] text-mute">
              Full-screen offer image after landing — any storefront page
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
            {pending ? 'Saving…' : 'Save popup'}
          </AdminActionButton>
        </div>
      </div>

      <FormError message={error} />
      <FormSuccess message={success} />

      <section className="rounded-2xl border border-cloud bg-white p-5 shadow-soft md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              Show on storefront
            </h2>
            <p className="mt-1 max-w-xl text-[13px] text-mute">
              When on, shoppers see this image after a short delay on home, shop,
              product, and other pages. Checkout and order tracking stay clear.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-cloud bg-paper px-3 py-2 text-[13px] font-semibold text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-navy"
              checked={popup.enabled}
              onChange={(e) => setPopup('enabled', e.target.checked)}
              disabled={pending}
            />
            {popup.enabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-cloud bg-white p-5 shadow-soft md:p-6">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
          Creative
        </h2>
        <p className="mt-1 text-[13px] text-mute">
          Upload the full poster (like a special-deal graphic). Portrait works
          best on mobile.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
          <div>
            <SiteMediaPicker
              pageKey="site"
              value={popup.image}
              onChange={onImageChange}
              accept="image"
              label={popup.image ? 'Replace image' : 'Upload image'}
              aspectClassName="aspect-[3/4]"
              fallback="/images/promo-autumn.png"
              className={[
                'rounded-2xl border border-cloud',
                !popup.image ? 'border-dashed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
            {!popup.image ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-mute">
                <ImageIcon size={14} strokeWidth={2} aria-hidden />
                Hover the preview and tap Upload image
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <Field label="Alt text" hint="Read aloud for accessibility">
              <input
                className={softFieldClassName}
                value={popup.alt}
                onChange={(e) => setPopup('alt', e.target.value)}
                disabled={pending}
                placeholder="Special deal — 12% off"
              />
            </Field>

            <Field
              label="Click-through link"
              hint="Paste /shop, or a full Viable URL like https://viable.fashion/test — the domain is stripped automatically. Other http(s) links stay external. Leave empty to only dismiss."
            >
              <input
                className={softFieldClassName}
                value={popup.href}
                onChange={(e) => setPopup('href', e.target.value)}
                onBlur={(e) => setPopup('href', normalizeSiteHref(e.target.value))}
                disabled={pending}
                placeholder="/shop or https://viable.inventivelab.bd/test"
              />
            </Field>

            <Field
              label="Delay before showing (seconds)"
              hint={`0–${MARKETING_POPUP_DELAY_MAX}. Example: 3 = appears after landing for a few seconds.`}
            >
              <input
                type="number"
                min={MARKETING_POPUP_DELAY_MIN}
                max={MARKETING_POPUP_DELAY_MAX}
                className={softFieldClassName}
                value={popup.delaySeconds}
                onChange={(e) =>
                  setPopup(
                    'delaySeconds',
                    Math.min(
                      MARKETING_POPUP_DELAY_MAX,
                      Math.max(
                        MARKETING_POPUP_DELAY_MIN,
                        Number(e.target.value) || 0,
                      ),
                    ),
                  )
                }
                disabled={pending}
              />
            </Field>

            <Field
              label="Show again after dismiss"
              hint="“Once” is recommended so shoppers are not interrupted every visit."
            >
              <select
                className={softFieldClassName}
                value={popup.frequency}
                onChange={(e) =>
                  setPopup(
                    'frequency',
                    e.target.value as MarketingPopupFrequency,
                  )
                }
                disabled={pending}
              >
                <option value="once">Once (until you post a new image)</option>
                <option value="session">Once per browser session</option>
                <option value="always">Every page load</option>
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Start (optional)"
                hint="Leave blank to go live immediately when enabled."
              >
                <input
                  type="datetime-local"
                  className={softFieldClassName}
                  value={toDatetimeLocalValue(popup.startsAt)}
                  onChange={(e) =>
                    setPopup('startsAt', fromDatetimeLocalValue(e.target.value))
                  }
                  disabled={pending}
                />
              </Field>
              <Field
                label="End (optional)"
                hint="Leave blank to keep running until you turn it off."
              >
                <input
                  type="datetime-local"
                  className={softFieldClassName}
                  value={toDatetimeLocalValue(popup.endsAt)}
                  onChange={(e) =>
                    setPopup('endsAt', fromDatetimeLocalValue(e.target.value))
                  }
                  disabled={pending}
                />
              </Field>
            </div>

            <p className="text-[12px] text-mute">
              Campaign id:{' '}
              <code className="rounded bg-paper px-1.5 py-0.5 text-[11px]">
                {popup.campaignKey}
              </code>
              {' · '}
              changes automatically when you replace the image so previous
              dismissals do not hide the new offer.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
