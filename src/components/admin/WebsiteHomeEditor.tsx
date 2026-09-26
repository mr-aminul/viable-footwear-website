'use client'

import {
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
} from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import { FormError, FormSuccess } from '@/components/admin/ui'
import { ProductCard } from '@/components/ProductCard'
import { WhatsAppOrderVisual } from '@/components/WhatsAppOrderVisual'
import { HeroMediaBackground } from '@/components/website/HeroMediaBackground'
import {
  SiteLinkPicker,
  type SiteLinkCategory,
} from '@/components/website/SiteLinkPicker'
import { SiteMediaPicker } from '@/components/website/SiteMediaPicker'
import {
  WysiwygInput,
  WysiwygInputOnDark,
  WysiwygTextarea,
  WysiwygTextareaOnDark,
} from '@/components/website/WysiwygFields'
import type { Product } from '@/lib/catalog/types'
import { saveHomePageContent } from '@/lib/website/actions'
import { MAX_HERO_SLIDES } from '@/lib/website/constants'
import { resolveSiteMediaUrl } from '@/lib/website/media-url'
import type {
  HeroMediaMode,
  HomePageContent,
  HomeSectionKey,
  PromoCardContent,
} from '@/lib/website/types'

type EditorCategory = SiteLinkCategory & {
  image: string
  count: number
}

type WebsiteHomeEditorProps = {
  initial: HomePageContent
  categories: EditorCategory[]
  featured: Product[]
  foamPicks: Product[]
}

const SLIDE_INTERVAL_SECONDS = [2, 3, 4, 5, 6, 8] as const
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

function SectionToggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Section visible on site' : 'Section hidden on site'}
      onClick={() => onChange(!enabled)}
      className={[
        'relative h-4 w-7 shrink-0 rounded-full transition-colors duration-200',
        enabled ? 'bg-navy' : 'bg-cloud',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
          enabled ? 'translate-x-3' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

/** Non-sticky toggle placed directly above a section heading. */
function SectionToggleBar({
  title,
  enabled,
  onEnabledChange,
}: {
  title: string
  enabled: boolean
  onEnabledChange: (next: boolean) => void
}) {
  return (
    <div className="mb-3 flex justify-end">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-cloud/80 bg-paper/90 px-2 py-1 text-ink shadow-sm">
        <span className="text-[10px] font-medium uppercase tracking-wider text-mute">
          {title}
        </span>
        <SectionToggle enabled={enabled} onChange={onEnabledChange} />
      </div>
    </div>
  )
}

function SectionFrame({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  return (
    <div
      className={
        enabled ? undefined : 'relative opacity-45 grayscale-[0.35]'
      }
    >
      {!enabled ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-paper/20"
          aria-hidden
        />
      ) : null}
      {children}
    </div>
  )
}

function PromoEditor({
  promo,
  onChange,
  side,
  categories,
}: {
  promo: PromoCardContent
  side: 'left' | 'right'
  categories: SiteLinkCategory[]
  onChange: (next: PromoCardContent) => void
}) {
  return (
    <article
      className="group/promo relative grid min-h-[200px] grid-cols-[1.15fr_0.85fr] items-stretch overflow-hidden rounded-[1.65rem] text-white md:min-h-[220px]"
      style={{ backgroundColor: promo.bgColor }}
    >
      <label className="absolute top-3 left-3 z-20 opacity-0 transition-opacity group-hover/promo:opacity-100 focus-within:opacity-100">
        <span className="sr-only">Background color</span>
        <input
          type="color"
          value={promo.bgColor}
          onChange={(e) => onChange({ ...promo, bgColor: e.target.value })}
          className="h-6 w-6 cursor-pointer rounded-full border border-white/40 bg-transparent p-0 shadow-sm"
          title="Background color"
        />
      </label>
      <div className="z-10 flex flex-col justify-center px-5 py-5 md:px-7 md:py-6">
        <WysiwygInputOnDark
          value={promo.eyebrow}
          onChange={(e) => onChange({ ...promo, eyebrow: e.target.value })}
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70"
        />
        <WysiwygTextareaOnDark
          value={promo.title}
          rows={2}
          onChange={(e) => onChange({ ...promo, title: e.target.value })}
          className="mt-1.5 font-display text-[1.55rem] font-extrabold leading-tight tracking-tight md:text-[1.85rem]"
        />
        <div className="mt-4 inline-flex w-fit items-center gap-1.5">
          <div className="inline-flex rounded-full bg-cream px-4 py-2">
            <WysiwygInput
              value={promo.cta.label}
              onChange={(e) =>
                onChange({
                  ...promo,
                  cta: { ...promo.cta, label: e.target.value },
                })
              }
              className="w-auto min-w-[6rem] text-[13px] font-semibold text-navy-deep"
              placeholder="Shop now"
            />
          </div>
          <SiteLinkPicker
            value={promo.cta.href}
            onChange={(href) =>
              onChange({ ...promo, cta: { ...promo.cta, href } })
            }
            categories={categories}
            variant="dark"
          />
        </div>
      </div>
      <div className="relative min-h-[180px]">
        <SiteMediaPicker
          pageKey="home"
          value={promo.image}
          onChange={(path) => onChange({ ...promo, image: path })}
          label={`Replace ${side} image`}
          aspectClassName="h-full min-h-[180px]"
        />
      </div>
    </article>
  )
}

/**
 * Live-preview editor for the home landing page.
 * Layout mirrors the storefront; fields are soft inputs over the real composition.
 */
export function WebsiteHomeEditor({
  initial,
  categories,
  featured,
  foamPicks,
}: WebsiteHomeEditorProps) {
  const [content, setContent] = useState(initial)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initial),
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSlideDetails, setShowSlideDetails] = useState<
    Record<string, boolean>
  >({})
  const [showHeroMediaControls, setShowHeroMediaControls] = useState(false)

  const hero = content.hero
  const isDirty = JSON.stringify(content) !== savedSnapshot

  const setHero = (patch: Partial<typeof hero>) => {
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, ...patch } }))
  }

  const setSectionEnabled = (key: HomeSectionKey, enabled: boolean) => {
    if (key === 'hero') return
    setContent((prev) => ({
      ...prev,
      sections: { ...prev.sections, hero: true, [key]: enabled },
    }))
  }

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)
    const result = await saveHomePageContent(content)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setSavedSnapshot(JSON.stringify(content))
    setSuccess('Home page saved. Shoppers will see these changes.')
    return true
  }

  useUnsavedChanges(isDirty, performSave)

  const onSave = () => {
    startTransition(async () => {
      await performSave()
    })
  }

  const mediaModes: { id: HeroMediaMode; label: string }[] = [
    { id: 'image', label: 'One photo' },
    { id: 'video', label: 'Video' },
    { id: 'slideshow', label: 'Photo slideshow' },
  ]

  const intervalSeconds = Math.round(hero.slideIntervalMs / 1000)
  const nearestInterval =
    SLIDE_INTERVAL_SECONDS.find((s) => s >= intervalSeconds) ??
    SLIDE_INTERVAL_SECONDS[SLIDE_INTERVAL_SECONDS.length - 1]

  const moveSlide = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= hero.slides.length) return
    const slides = [...hero.slides]
    const [removed] = slides.splice(index, 1)
    slides.splice(next, 0, removed)
    setHero({ slides })
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
            <p className="text-[14px] font-semibold text-ink">Edit Home</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
              Unsaved changes
            </span>
          ) : null}
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-cloud bg-white px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:border-navy/30"
          >
            <Eye size={14} />
            Preview live site
          </Link>
          <AdminActionButton onClick={onSave} disabled={pending || !isDirty}>
            {pending ? 'Saving…' : 'Save home page'}
          </AdminActionButton>
        </div>
      </div>

      <div className="px-0 pb-16">
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

            <div className="absolute top-4 right-4 z-20 opacity-70 transition hover:opacity-100 md:top-6 md:right-6">
              <button
                type="button"
                onClick={() => setShowHeroMediaControls((v) => !v)}
                className="rounded-full border border-white/25 bg-navy-deep/70 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition hover:bg-navy-deep/90"
              >
                {showHeroMediaControls ? 'Hide background' : 'Edit background'}
              </button>
            </div>

            {showHeroMediaControls ? (
              <div className="absolute top-14 right-4 z-20 max-h-[min(70vh,520px)] w-[min(100%-2rem,22rem)] overflow-y-auto rounded-2xl border border-white/20 bg-navy-deep/90 p-4 shadow-lift backdrop-blur-md md:top-16 md:right-6">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-white/60">
                  Background
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mediaModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setHero({ mediaMode: mode.id })}
                      className={[
                        'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition',
                        hero.mediaMode === mode.id
                          ? 'bg-spark text-white'
                          : 'bg-white/10 text-white/80 hover:bg-white/20',
                      ].join(' ')}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {hero.mediaMode === 'image' ? (
                  <div className="mt-3">
                    <SiteMediaPicker
                      pageKey="home"
                      value={hero.image}
                      onChange={(path) => setHero({ image: path })}
                      label="Choose hero photo"
                    />
                  </div>
                ) : null}

                {hero.mediaMode === 'video' ? (
                  <div className="mt-3">
                    <SiteMediaPicker
                      pageKey="home"
                      value={hero.video}
                      onChange={(path) => setHero({ video: path })}
                      accept="video"
                      label="Upload looping video"
                      fallback="/images/hero.png"
                    />
                  </div>
                ) : null}

                {hero.mediaMode === 'slideshow' ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
                      <p className="text-[12px] font-semibold text-white/80">
                        Change photo every {nearestInterval}s
                      </p>
                      <input
                        type="range"
                        min={0}
                        max={SLIDE_INTERVAL_SECONDS.length - 1}
                        step={1}
                        value={Math.max(
                          0,
                          SLIDE_INTERVAL_SECONDS.indexOf(
                            nearestInterval as (typeof SLIDE_INTERVAL_SECONDS)[number],
                          ),
                        )}
                        onChange={(e) => {
                          const seconds =
                            SLIDE_INTERVAL_SECONDS[Number(e.target.value)] ?? 5
                          setHero({ slideIntervalMs: seconds * 1000 })
                        }}
                        className="w-full accent-spark"
                        aria-label="Seconds between slides"
                      />
                    </div>

                    {hero.slides.map((slide, index) => {
                      const detailsOpen = Boolean(showSlideDetails[slide.id])
                      return (
                        <div
                          key={slide.id}
                          className="rounded-xl border border-white/15 bg-white/5 p-2"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold text-white/70">
                              Photo {index + 1}
                            </p>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveSlide(index, -1)}
                                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                                aria-label="Move photo up"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={index === hero.slides.length - 1}
                                onClick={() => moveSlide(index, 1)}
                                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                                aria-label="Move photo down"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={hero.slides.length <= 1}
                                onClick={() =>
                                  setHero({
                                    slides: hero.slides.filter(
                                      (s) => s.id !== slide.id,
                                    ),
                                  })
                                }
                                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                                aria-label="Remove photo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <SiteMediaPicker
                            pageKey="home"
                            value={slide.src}
                            onChange={(path) => {
                              const slides = hero.slides.map((s) =>
                                s.id === slide.id ? { ...s, src: path } : s,
                              )
                              setHero({ slides })
                            }}
                            label="Choose this photo"
                            aspectClassName="aspect-[16/9]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSlideDetails((prev) => ({
                                ...prev,
                                [slide.id]: !prev[slide.id],
                              }))
                            }
                            className="mt-2 text-[11px] font-semibold text-white/55 underline-offset-2 hover:text-white/80 hover:underline"
                          >
                            {detailsOpen ? 'Hide description' : 'Description'}
                          </button>
                          {detailsOpen ? (
                            <div className="mt-2 space-y-1">
                              <WysiwygInputOnDark
                                value={slide.alt}
                                onChange={(e) => {
                                  const slides = hero.slides.map((s) =>
                                    s.id === slide.id
                                      ? { ...s, alt: e.target.value }
                                      : s,
                                  )
                                  setHero({ slides })
                                }}
                                className="text-[12px]"
                              />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                    {hero.slides.length < MAX_HERO_SLIDES ? (
                      <button
                        type="button"
                        onClick={() =>
                          setHero({
                            slides: [
                              ...hero.slides,
                              {
                                id: String(Date.now()),
                                src: hero.image || '/images/hero.png',
                                alt: '',
                              },
                            ],
                          })
                        }
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-white/35 py-2 text-[12px] font-semibold text-white/80 transition hover:bg-white/10"
                      >
                        <Plus size={14} />
                        Add another photo
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="relative mx-auto flex min-h-[min(88svh,820px)] max-w-7xl flex-col justify-end px-4 pb-28 pt-28 md:justify-center md:px-6 md:pb-28 md:pt-20 lg:px-8">
              <div className="max-w-xl">
                <div className="w-fit max-w-xs">
                  <SiteMediaPicker
                    pageKey="home"
                    value={hero.logoSrc}
                    onChange={(path) => setHero({ logoSrc: path })}
                    label="Replace logo"
                    aspectClassName="aspect-[4/1]"
                    fallback="/logo.png"
                  />
                </div>
                <div className="mt-5 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <WysiwygInputOnDark
                      value={hero.headlineBefore}
                      onChange={(e) =>
                        setHero({ headlineBefore: e.target.value })
                      }
                      className="w-auto min-w-[8rem] flex-1 text-[clamp(1.4rem,3.4vw,2rem)] font-medium leading-snug text-white/95"
                      placeholder="Step into"
                    />
                    <WysiwygInputOnDark
                      value={hero.headlineEm}
                      onChange={(e) => setHero({ headlineEm: e.target.value })}
                      className="w-auto min-w-[10rem] flex-1 font-logo text-[clamp(1.4rem,3.4vw,2rem)] not-italic text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]"
                      placeholder="everyday greatness"
                    />
                  </div>
                </div>
                <WysiwygTextareaOnDark
                  value={hero.subcopy}
                  onChange={(e) => setHero({ subcopy: e.target.value })}
                  rows={2}
                  className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65 md:text-[16px]"
                />
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-spark px-6 py-3.5 shadow-lg shadow-spark/25">
                      <WysiwygInputOnDark
                        value={hero.primaryCta.label}
                        onChange={(e) =>
                          setHero({
                            primaryCta: {
                              ...hero.primaryCta,
                              label: e.target.value,
                            },
                          })
                        }
                        className="w-auto min-w-[6rem] text-[14px] font-semibold text-white"
                        placeholder="Shop now"
                      />
                      <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                    <SiteLinkPicker
                      value={hero.primaryCta.href}
                      onChange={(href) =>
                        setHero({
                          primaryCta: { ...hero.primaryCta, href },
                        })
                      }
                      categories={categories}
                      variant="dark"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3.5 backdrop-blur-sm">
                      <WysiwygInputOnDark
                        value={hero.secondaryCta.label}
                        onChange={(e) =>
                          setHero({
                            secondaryCta: {
                              ...hero.secondaryCta,
                              label: e.target.value,
                            },
                          })
                        }
                        className="w-auto min-w-[7rem] text-[14px] font-semibold text-white"
                        placeholder="Explore crocs"
                      />
                    </div>
                    <SiteLinkPicker
                      value={hero.secondaryCta.href}
                      onChange={(href) =>
                        setHero({
                          secondaryCta: { ...hero.secondaryCta, href },
                        })
                      }
                      categories={categories}
                      variant="dark"
                    />
                  </div>
                </div>
              </div>
            </div>

            <ul className="absolute bottom-6 left-4 z-10 flex flex-row flex-wrap items-center gap-x-5 gap-y-2 sm:bottom-8 sm:left-6 md:gap-x-7 md:left-8 lg:left-10">
              {hero.usps.map((label, i) => {
                const Icon = heroUspIcons[i % heroUspIcons.length]
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2.5 text-[13px] font-semibold text-white md:text-[14px] [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <WysiwygInputOnDark
                      value={label}
                      onChange={(e) => {
                        const usps = [...hero.usps]
                        usps[i] = e.target.value
                        setHero({ usps })
                      }}
                      className="w-auto min-w-[7rem] max-w-[11rem] text-[13px] font-semibold text-white md:text-[14px]"
                    />
                  </li>
                )
              })}
            </ul>
          </section>

        <SectionFrame enabled={content.sections.categories}>
          <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8 lg:py-20">
            <SectionToggleBar
              title="Categories"
              enabled={content.sections.categories}
              onEnabledChange={(enabled) =>
                setSectionEnabled('categories', enabled)
              }
            />
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <WysiwygInput
                  value={content.categories.title}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      categories: { ...p.categories, title: e.target.value },
                    }))
                  }
                  className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl"
                />
                <WysiwygInput
                  value={content.categories.subtitle}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      categories: { ...p.categories, subtitle: e.target.value },
                    }))
                  }
                  className="mt-2 text-[14px] text-mute md:text-[15px]"
                />
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white sm:inline-flex">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
              {categories.map((cat) => (
                <div
                  key={cat.slug}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.15rem] bg-white text-center shadow-card"
                >
                  <span className="flex aspect-square w-full items-center justify-center overflow-hidden">
                    <img
                      src={cat.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <div className="flex flex-col items-center px-3 pb-3.5 pt-1">
                    <h3 className="text-[14px] font-semibold tracking-tight text-ink">
                      {cat.name}
                    </h3>
                    <p className="text-[12px] font-medium text-mute">
                      {cat.count} {cat.count === 1 ? 'item' : 'items'}
                    </p>
                    <span className="mt-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-navy">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.promoDual}>
          <section className="mx-auto max-w-7xl px-4 pb-4 md:px-6 lg:px-8">
            <SectionToggleBar
              title="Promo banners"
              enabled={content.sections.promoDual}
              onEnabledChange={(enabled) =>
                setSectionEnabled('promoDual', enabled)
              }
            />
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <PromoEditor
                side="left"
                promo={content.promoDual.left}
                categories={categories}
                onChange={(left) =>
                  setContent((p) => ({
                    ...p,
                    promoDual: { ...p.promoDual, left },
                  }))
                }
              />
              <PromoEditor
                side="right"
                promo={content.promoDual.right}
                categories={categories}
                onChange={(right) =>
                  setContent((p) => ({
                    ...p,
                    promoDual: { ...p.promoDual, right },
                  }))
                }
              />
            </div>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.mostPopular}>
          <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8">
            <SectionToggleBar
              title="Most popular"
              enabled={content.sections.mostPopular}
              onEnabledChange={(enabled) =>
                setSectionEnabled('mostPopular', enabled)
              }
            />
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <WysiwygInput
                  value={content.mostPopular.title}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      mostPopular: { ...p.mostPopular, title: e.target.value },
                    }))
                  }
                  className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl"
                />
                <WysiwygInput
                  value={content.mostPopular.subtitle}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      mostPopular: {
                        ...p.mostPopular,
                        subtitle: e.target.value,
                      },
                    }))
                  }
                  className="mt-2 text-[14px] text-mute md:text-[15px]"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
              {featured.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} preview />
              ))}
            </div>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.foamCrocs}>
          <section className="bg-sand/80 py-14 md:py-16">
            <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
              <SectionToggleBar
                title="Foam & crocs"
                enabled={content.sections.foamCrocs}
                onEnabledChange={(enabled) =>
                  setSectionEnabled('foamCrocs', enabled)
                }
              />
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <WysiwygInput
                    value={content.foamCrocs.title}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        foamCrocs: { ...p.foamCrocs, title: e.target.value },
                      }))
                    }
                    className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl"
                  />
                  <WysiwygInput
                    value={content.foamCrocs.subtitle}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        foamCrocs: {
                          ...p.foamCrocs,
                          subtitle: e.target.value,
                        },
                      }))
                    }
                    className="mt-2 text-[14px] text-mute md:text-[15px]"
                  />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-[13px] font-semibold text-white">
                  See all
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-9 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
                {foamPicks.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} preview />
                ))}
              </div>
            </div>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.saleBanner}>
          <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
            <SectionToggleBar
              title="Sale banner"
              enabled={content.sections.saleBanner}
              onEnabledChange={(enabled) =>
                setSectionEnabled('saleBanner', enabled)
              }
            />
            <div className="relative overflow-hidden rounded-[1.75rem] bg-navy-deep md:rounded-[2rem]">
              <img
                src={resolveSiteMediaUrl(content.saleBanner.image)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-deep from-[0%] via-navy-deep/35 via-[42%] to-transparent to-[78%]" />
              <div className="absolute top-4 right-4 z-20 w-[min(100%-2rem,14rem)]">
                <SiteMediaPicker
                  pageKey="home"
                  value={content.saleBanner.image}
                  onChange={(path) =>
                    setContent((p) => ({
                      ...p,
                      saleBanner: { ...p.saleBanner, image: path },
                    }))
                  }
                  label="Replace sale photo"
                  aspectClassName="aspect-[4/3]"
                />
              </div>
              <div className="relative flex min-h-[280px] flex-col justify-center px-8 py-12 md:min-h-[320px] md:px-14 lg:px-16">
                <WysiwygInputOnDark
                  value={content.saleBanner.eyebrow}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      saleBanner: {
                        ...p.saleBanner,
                        eyebrow: e.target.value,
                      },
                    }))
                  }
                  className="max-w-xs text-[12px] font-semibold uppercase tracking-[0.18em] text-spark"
                />
                <WysiwygInputOnDark
                  value={content.saleBanner.title}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      saleBanner: {
                        ...p.saleBanner,
                        title: e.target.value,
                      },
                    }))
                  }
                  className="mt-3 max-w-lg font-display text-4xl font-extrabold text-white md:text-5xl"
                />
                <div className="mt-2 flex max-w-md flex-wrap items-baseline gap-1 text-[16px] text-white/70">
                  <WysiwygInputOnDark
                    value={content.saleBanner.bodyBefore}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        saleBanner: {
                          ...p.saleBanner,
                          bodyBefore: e.target.value,
                        },
                      }))
                    }
                    className="w-auto max-w-[8rem] text-[16px]"
                    placeholder="Up to"
                  />
                  <WysiwygInputOnDark
                    value={content.saleBanner.highlight}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        saleBanner: {
                          ...p.saleBanner,
                          highlight: e.target.value,
                        },
                      }))
                    }
                    className="w-auto max-w-[8rem] text-[16px] font-semibold text-spark"
                    placeholder="40% off"
                  />
                  <WysiwygInputOnDark
                    value={content.saleBanner.bodyAfter}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        saleBanner: {
                          ...p.saleBanner,
                          bodyAfter: e.target.value,
                        },
                      }))
                    }
                    className="min-w-[6rem] flex-1 text-[16px]"
                  />
                </div>
                <div className="mt-7 inline-flex w-fit items-center gap-1.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3">
                    <WysiwygInput
                      value={content.saleBanner.cta.label}
                      onChange={(e) =>
                        setContent((p) => ({
                          ...p,
                          saleBanner: {
                            ...p.saleBanner,
                            cta: {
                              ...p.saleBanner.cta,
                              label: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-auto min-w-[7rem] text-[14px] font-semibold text-ink"
                      placeholder="Shop the sale"
                    />
                    <ArrowRight className="h-4 w-4 text-ink" />
                  </div>
                  <SiteLinkPicker
                    value={content.saleBanner.cta.href}
                    onChange={(href) =>
                      setContent((p) => ({
                        ...p,
                        saleBanner: {
                          ...p.saleBanner,
                          cta: { ...p.saleBanner.cta, href },
                        },
                      }))
                    }
                    categories={categories}
                    variant="dark"
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-6 right-6 z-10 md:bottom-8 md:right-10">
                <WysiwygInputOnDark
                  value={content.saleBanner.bigText}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      saleBanner: {
                        ...p.saleBanner,
                        bigText: e.target.value,
                      },
                    }))
                  }
                  className="pointer-events-auto w-auto max-w-[8rem] text-right font-display text-[clamp(3rem,12vw,7rem)] font-extrabold leading-none text-spark/90"
                  placeholder="40%"
                />
              </div>
            </div>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.whatsapp}>
          <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
            <SectionToggleBar
              title="WhatsApp order"
              enabled={content.sections.whatsapp}
              onEnabledChange={(enabled) =>
                setSectionEnabled('whatsapp', enabled)
              }
            />
            <article className="grid overflow-hidden rounded-[2rem] bg-[#1b4332] text-white md:grid-cols-[0.85fr_1.15fr]">
              <div className="relative min-h-[220px] w-full self-stretch">
                <div className="absolute inset-0">
                  <WhatsAppOrderVisual />
                </div>
              </div>
              <div className="relative isolate overflow-hidden px-5 py-6 md:px-6 md:py-8 md:pr-7 md:pl-5">
                <WhatsAppIcon className="pointer-events-none absolute -right-5 -top-7 z-0 w-[min(11.25rem,42%)] rotate-12 text-[#22d664] opacity-[0.18] max-md:right-1 max-md:-top-2 max-md:w-[min(6.25rem,30%)] max-md:opacity-[0.14]" />
                <WysiwygInputOnDark
                  value={content.whatsapp.title}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      whatsapp: { ...p.whatsapp, title: e.target.value },
                    }))
                  }
                  className="relative z-10 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold tracking-tight"
                />
                <WysiwygTextareaOnDark
                  value={content.whatsapp.body}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      whatsapp: { ...p.whatsapp, body: e.target.value },
                    }))
                  }
                  rows={3}
                  className="relative z-10 mt-1.5 max-w-md text-[0.95rem] leading-[1.55] text-white/80"
                />
                <div className="relative z-10 mt-3.5 flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#22d664] px-[1.15rem] py-[0.7rem]">
                    <WhatsAppIcon className="h-[18px] w-[18px] text-[#0b3d1c]" />
                    <WysiwygInput
                      value={content.whatsapp.primaryCtaLabel}
                      onChange={(e) =>
                        setContent((p) => ({
                          ...p,
                          whatsapp: {
                            ...p.whatsapp,
                            primaryCtaLabel: e.target.value,
                          },
                        }))
                      }
                      className="w-auto min-w-[8rem] text-[14px] font-extrabold text-[#0b3d1c]"
                      placeholder="WhatsApp to order"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/45 px-[1.15rem] py-[0.7rem]">
                      <WysiwygInputOnDark
                        value={content.whatsapp.secondaryCta.label}
                        onChange={(e) =>
                          setContent((p) => ({
                            ...p,
                            whatsapp: {
                              ...p.whatsapp,
                              secondaryCta: {
                                ...p.whatsapp.secondaryCta,
                                label: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-auto min-w-[7rem] text-[14px] font-extrabold text-white"
                        placeholder="Browse the shop"
                      />
                    </div>
                    <SiteLinkPicker
                      value={content.whatsapp.secondaryCta.href}
                      onChange={(href) =>
                        setContent((p) => ({
                          ...p,
                          whatsapp: {
                            ...p.whatsapp,
                            secondaryCta: {
                              ...p.whatsapp.secondaryCta,
                              href,
                            },
                          },
                        }))
                      }
                      categories={categories}
                      variant="dark"
                    />
                  </div>
                </div>
              </div>
            </article>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.brandStrip}>
          <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16 lg:px-8">
            <SectionToggleBar
              title="Brand story"
              enabled={content.sections.brandStrip}
              onEnabledChange={(enabled) =>
                setSectionEnabled('brandStrip', enabled)
              }
            />
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div className="overflow-hidden rounded-[1.5rem] shadow-card">
              <SiteMediaPicker
                pageKey="home"
                value={content.brandStrip.image}
                onChange={(path) =>
                  setContent((p) => ({
                    ...p,
                    brandStrip: { ...p.brandStrip, image: path },
                  }))
                }
                label="Replace brand photo"
                aspectClassName="aspect-[4/3]"
              />
            </div>
            <div>
              <WysiwygInput
                value={content.brandStrip.eyebrow}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    brandStrip: { ...p.brandStrip, eyebrow: e.target.value },
                  }))
                }
                className="text-[12px] font-semibold uppercase tracking-[0.16em] text-navy"
              />
              <WysiwygInput
                value={content.brandStrip.title}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    brandStrip: { ...p.brandStrip, title: e.target.value },
                  }))
                }
                className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink text-balance md:text-4xl"
              />
              <WysiwygTextarea
                value={content.brandStrip.body}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    brandStrip: { ...p.brandStrip, body: e.target.value },
                  }))
                }
                rows={4}
                className="mt-4 text-[15px] leading-relaxed text-mute md:text-[16px]"
              />
              <div className="mt-7 inline-flex items-center gap-1.5">
                <div className="inline-flex items-center gap-2 text-[14px] font-semibold text-navy">
                  <WysiwygInput
                    value={content.brandStrip.cta.label}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        brandStrip: {
                          ...p.brandStrip,
                          cta: { ...p.brandStrip.cta, label: e.target.value },
                        },
                      }))
                    }
                    className="w-auto min-w-[6rem] text-[14px] font-semibold text-navy underline-offset-4"
                    placeholder="Our story"
                  />
                  <ArrowRight className="h-4 w-4" />
                </div>
                <SiteLinkPicker
                  value={content.brandStrip.cta.href}
                  onChange={(href) =>
                    setContent((p) => ({
                      ...p,
                      brandStrip: {
                        ...p.brandStrip,
                        cta: { ...p.brandStrip.cta, href },
                      },
                    }))
                  }
                  categories={categories}
                  variant="light"
                />
              </div>
            </div>
            </div>
          </section>
        </SectionFrame>

        <SectionFrame enabled={content.sections.trust}>
          <section className="border-y border-cloud/80 bg-sand/70">
            <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6 lg:px-8">
              <SectionToggleBar
                title="Trust strip"
                enabled={content.sections.trust}
                onEnabledChange={(enabled) =>
                  setSectionEnabled('trust', enabled)
                }
              />
            </div>
            <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 pb-10 md:grid-cols-4 md:gap-4 md:px-6 md:pb-12 lg:px-8">
              {content.trust.map((item, index) => {
                const Icon = trustIcons[index % trustIcons.length]
                return (
                  <li
                    key={index}
                    className="flex items-start gap-3 md:justify-center"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-soft">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <WysiwygInput
                        value={item.title}
                        onChange={(e) => {
                          const trust = content.trust.map((t, i) =>
                            i === index ? { ...t, title: e.target.value } : t,
                          )
                          setContent((p) => ({ ...p, trust }))
                        }}
                        className="text-[13px] font-semibold text-ink md:text-[14px]"
                      />
                      <WysiwygInput
                        value={item.text}
                        onChange={(e) => {
                          const trust = content.trust.map((t, i) =>
                            i === index ? { ...t, text: e.target.value } : t,
                          )
                          setContent((p) => ({ ...p, trust }))
                        }}
                        className="mt-0.5 text-[12px] text-mute md:text-[13px]"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </SectionFrame>
      </div>
    </div>
  )
}
