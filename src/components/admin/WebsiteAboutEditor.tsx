'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye } from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import { FormError, FormSuccess } from '@/components/admin/ui'
import { SiteMediaPicker } from '@/components/website/SiteMediaPicker'
import {
  WysiwygInput,
  WysiwygInputOnDark,
  WysiwygTextarea,
  WysiwygTextareaOnDark,
} from '@/components/website/WysiwygFields'
import { saveAboutPageContent } from '@/lib/website/actions'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'
import type { AboutPageContent } from '@/lib/website/types'

type WebsiteAboutEditorProps = {
  initial: AboutPageContent
}

export function WebsiteAboutEditor({ initial }: WebsiteAboutEditorProps) {
  const [content, setContent] = useState(initial)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initial),
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isDirty = JSON.stringify(content) !== savedSnapshot

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    const result = await saveAboutPageContent(content)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setSavedSnapshot(JSON.stringify(content))
    setSuccess('About page saved. Shoppers will see these changes.')
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  const onSave = () => {
    startTransition(async () => {
      await performSave()
    })
  }

  return (
    <div className="-mx-4 -mb-8 md:-mx-6 lg:-mx-8">
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-cloud bg-paper/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/website"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white transition hover:bg-navy-deep"
            aria-label="Back to Website Modifier"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="text-[14px] font-semibold text-ink">Edit About</p>

          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
              Unsaved changes
            </span>
          ) : null}
          <Link
            href="/about"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:border-navy/30"
          >
            <Eye size={14} />
            Preview live site
          </Link>
          <AdminActionButton onClick={onSave} disabled={pending || !isDirty}>
            {pending ? 'Saving…' : 'Save about page'}
          </AdminActionButton>
        </div>
      </div>

      <div className="space-y-6 pb-16 pt-2">
        {error ? (
          <div className="px-4 md:px-6">
            <FormError message={error} />
          </div>
        ) : null}
        {success ? (
          <div className="px-4 md:px-6">
            <FormSuccess message={success} />
          </div>
        ) : null}

        <section className="relative overflow-hidden bg-navy-deep">
          <img
            src={resolveSiteMediaUrl(content.hero.image, '/images/store.jpg')}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/70 to-navy-deep/50" />
          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-6 md:py-20 lg:px-8">
            <div className="max-w-2xl space-y-3 text-white">
              <WysiwygInputOnDark
                value={content.hero.eyebrow}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    hero: { ...p.hero, eyebrow: e.target.value },
                  }))
                }
                className="text-[12px] font-semibold uppercase tracking-[0.16em] text-spark"
              />
              <WysiwygTextareaOnDark
                value={content.hero.title}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    hero: { ...p.hero, title: e.target.value },
                  }))
                }
                rows={2}
                className="font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[0.95]"
              />
              <WysiwygTextareaOnDark
                value={content.hero.subcopy}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    hero: { ...p.hero, subcopy: e.target.value },
                  }))
                }
                rows={3}
                className="text-[16px] text-white/80"
              />
            </div>
            <div>
              <SiteMediaPicker
                pageKey="about"
                value={content.hero.image}
                onChange={(path) =>
                  setContent((p) => ({
                    ...p,
                    hero: { ...p.hero, image: path },
                  }))
                }
                label="Choose hero photo"
                fallback="/images/store.jpg"
                className="rounded-2xl"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2 md:px-6">
          <div className="space-y-3">
            <WysiwygInput
              value={content.whoWeAre.title}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  whoWeAre: { ...p.whoWeAre, title: e.target.value },
                }))
              }
              className="font-display text-3xl font-extrabold"
            />
            <WysiwygTextarea
              value={content.whoWeAre.body1}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  whoWeAre: { ...p.whoWeAre, body1: e.target.value },
                }))
              }
              rows={4}
              className="text-[15px] text-mute"
            />
            <WysiwygTextarea
              value={content.whoWeAre.body2}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  whoWeAre: { ...p.whoWeAre, body2: e.target.value },
                }))
              }
              rows={4}
              className="text-[15px] text-mute"
            />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {content.whoWeAre.stats.map((stat, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-2xl bg-mist/80 px-5 py-6"
                >
                  <WysiwygInput
                    value={stat.value}
                    onChange={(e) => {
                      const stats = content.whoWeAre.stats.map((s, i) =>
                        i === index ? { ...s, value: e.target.value } : s,
                      )
                      setContent((p) => ({
                        ...p,
                        whoWeAre: { ...p.whoWeAre, stats },
                      }))
                    }}
                    className="font-display text-3xl font-extrabold text-navy"
                  />
                  <WysiwygInput
                    value={stat.label}
                    onChange={(e) => {
                      const stats = content.whoWeAre.stats.map((s, i) =>
                        i === index ? { ...s, label: e.target.value } : s,
                      )
                      setContent((p) => ({
                        ...p,
                        whoWeAre: { ...p.whoWeAre, stats },
                      }))
                    }}
                    className="text-[13px] text-mute"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-sand/70 py-12">
          <div className="mx-auto max-w-7xl space-y-3 px-4 md:px-6">
            <WysiwygInput
              value={content.sizeGuide.title}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  sizeGuide: { ...p.sizeGuide, title: e.target.value },
                }))
              }
              className="font-display text-3xl font-extrabold"
            />
            <WysiwygTextarea
              value={content.sizeGuide.subtitle}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  sizeGuide: { ...p.sizeGuide, subtitle: e.target.value },
                }))
              }
              rows={2}
              className="text-[14px] text-mute"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <WysiwygInput
            value={content.contact.title}
            onChange={(e) =>
              setContent((p) => ({
                ...p,
                contact: { ...p.contact, title: e.target.value },
              }))
            }
            className="mt-2 font-display text-3xl font-extrabold"
          />
        </section>
      </div>
    </div>
  )
}
