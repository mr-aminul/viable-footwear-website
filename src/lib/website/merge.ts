import {
  DEFAULT_SLIDE_INTERVAL_MS,
  MAX_HERO_SLIDES,
  type SitePageKey,
} from '@/lib/website/constants'
import {
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_SITE_CONTENT,
} from '@/lib/website/defaults'
import type {
  AboutPageContent,
  AboutStatContent,
  CtaLink,
  HeroMediaMode,
  HeroSlide,
  HomePageContent,
  HomeSectionKey,
  HomeSectionsVisibility,
  PromoCardContent,
  SaleBannerContent,
  SiteContent,
  TrustItemContent,
} from '@/lib/website/types'

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asHomeSections(value: unknown): HomeSectionsVisibility {
  const row = asRecord(value)
  const keys = Object.keys(DEFAULT_HOME_SECTIONS) as HomeSectionKey[]
  return Object.fromEntries(
    keys.map((key) => [
      key,
      // Hero is always on — only editable, never hideable.
      key === 'hero'
        ? true
        : asBoolean(row[key], DEFAULT_HOME_SECTIONS[key]),
    ]),
  ) as HomeSectionsVisibility
}

function asCta(value: unknown, fallback: CtaLink): CtaLink {
  const row = asRecord(value)
  return {
    label: asString(row.label, fallback.label),
    href: asString(row.href, fallback.href),
  }
}

function asMediaMode(value: unknown, fallback: HeroMediaMode): HeroMediaMode {
  if (value === 'image' || value === 'video' || value === 'slideshow') {
    return value
  }
  return fallback
}

function asSlides(value: unknown, fallback: HeroSlide[]): HeroSlide[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const slides = value
    .map((item, index) => {
      const row = asRecord(item)
      const src = asString(row.src, '')
      if (!src) return null
      return {
        id: asString(row.id, String(index + 1)),
        src,
        alt: asString(row.alt, ''),
      }
    })
    .filter((s): s is HeroSlide => Boolean(s))
    .slice(0, MAX_HERO_SLIDES)
  return slides.length > 0 ? slides : fallback
}

function asPromo(value: unknown, fallback: PromoCardContent): PromoCardContent {
  const row = asRecord(value)
  return {
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    title: asString(row.title, fallback.title),
    cta: asCta(row.cta, fallback.cta),
    image: asString(row.image, fallback.image),
    bgColor: asString(row.bgColor, fallback.bgColor),
  }
}

function asTrust(value: unknown, fallback: TrustItemContent[]): TrustItemContent[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  return value.map((item, index) => {
    const row = asRecord(item)
    const fb = fallback[index] ?? fallback[0]
    return {
      title: asString(row.title, fb.title),
      text: asString(row.text, fb.text),
    }
  })
}

function asStats(
  value: unknown,
  fallback: AboutStatContent[],
): AboutStatContent[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  return value.map((item, index) => {
    const row = asRecord(item)
    const fb = fallback[index] ?? fallback[0]
    return {
      value: asString(row.value, fb.value),
      label: asString(row.label, fb.label),
    }
  })
}

function asSale(
  value: unknown,
  fallback: SaleBannerContent,
): SaleBannerContent {
  const row = asRecord(value)
  return {
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    title: asString(row.title, fallback.title),
    bodyBefore: asString(row.bodyBefore, fallback.bodyBefore),
    highlight: asString(row.highlight, fallback.highlight),
    bodyAfter: asString(row.bodyAfter, fallback.bodyAfter),
    cta: asCta(row.cta, fallback.cta),
    image: asString(row.image, fallback.image),
    bigText: asString(row.bigText, fallback.bigText),
  }
}

export function mergeHomeContent(raw: unknown): HomePageContent {
  const d = DEFAULT_HOME_CONTENT
  const root = asRecord(raw)
  const hero = asRecord(root.hero)
  const categories = asRecord(root.categories)
  const promoDual = asRecord(root.promoDual)
  const mostPopular = asRecord(root.mostPopular)
  const foamCrocs = asRecord(root.foamCrocs)
  const whatsapp = asRecord(root.whatsapp)
  const brandStrip = asRecord(root.brandStrip)

  const uspsRaw = hero.usps
  const usps =
    Array.isArray(uspsRaw) && uspsRaw.length > 0
      ? uspsRaw.map((u, i) => asString(u, d.hero.usps[i] ?? ''))
      : d.hero.usps

  return {
    sections: asHomeSections(root.sections),
    hero: {
      mediaMode: asMediaMode(hero.mediaMode, d.hero.mediaMode),
      image: asString(hero.image, d.hero.image),
      video: asString(hero.video, d.hero.video),
      slides: asSlides(hero.slides, d.hero.slides),
      slideIntervalMs: Math.max(
        2000,
        asNumber(hero.slideIntervalMs, d.hero.slideIntervalMs || DEFAULT_SLIDE_INTERVAL_MS),
      ),
      logoSrc: asString(hero.logoSrc, d.hero.logoSrc),
      headlineBefore: asString(hero.headlineBefore, d.hero.headlineBefore),
      headlineEm: asString(hero.headlineEm, d.hero.headlineEm),
      subcopy: asString(hero.subcopy, d.hero.subcopy),
      primaryCta: asCta(hero.primaryCta, d.hero.primaryCta),
      secondaryCta: asCta(hero.secondaryCta, d.hero.secondaryCta),
      usps,
    },
    categories: {
      title: asString(categories.title, d.categories.title),
      subtitle: asString(categories.subtitle, d.categories.subtitle),
    },
    promoDual: {
      left: asPromo(promoDual.left, d.promoDual.left),
      right: asPromo(promoDual.right, d.promoDual.right),
    },
    mostPopular: {
      title: asString(mostPopular.title, d.mostPopular.title),
      subtitle: asString(mostPopular.subtitle, d.mostPopular.subtitle),
    },
    foamCrocs: {
      title: asString(foamCrocs.title, d.foamCrocs.title),
      subtitle: asString(foamCrocs.subtitle, d.foamCrocs.subtitle),
    },
    saleBanner: asSale(root.saleBanner, d.saleBanner),
    whatsapp: {
      title: asString(whatsapp.title, d.whatsapp.title),
      body: asString(whatsapp.body, d.whatsapp.body),
      primaryCtaLabel: asString(
        whatsapp.primaryCtaLabel,
        d.whatsapp.primaryCtaLabel,
      ),
      secondaryCta: asCta(whatsapp.secondaryCta, d.whatsapp.secondaryCta),
    },
    brandStrip: {
      eyebrow: asString(brandStrip.eyebrow, d.brandStrip.eyebrow),
      title: asString(brandStrip.title, d.brandStrip.title),
      body: asString(brandStrip.body, d.brandStrip.body),
      cta: asCta(brandStrip.cta, d.brandStrip.cta),
      image: asString(brandStrip.image, d.brandStrip.image),
    },
    trust: asTrust(root.trust, d.trust),
  }
}

export function mergeAboutContent(raw: unknown): AboutPageContent {
  const d = DEFAULT_ABOUT_CONTENT
  const root = asRecord(raw)
  const hero = asRecord(root.hero)
  const whoWeAre = asRecord(root.whoWeAre)
  const sizeGuide = asRecord(root.sizeGuide)
  const contact = asRecord(root.contact)

  return {
    hero: {
      image: asString(hero.image, d.hero.image),
      eyebrow: asString(hero.eyebrow, d.hero.eyebrow),
      title: asString(hero.title, d.hero.title),
      subcopy: asString(hero.subcopy, d.hero.subcopy),
    },
    whoWeAre: {
      title: asString(whoWeAre.title, d.whoWeAre.title),
      body1: asString(whoWeAre.body1, d.whoWeAre.body1),
      body2: asString(whoWeAre.body2, d.whoWeAre.body2),
      stats: asStats(whoWeAre.stats, d.whoWeAre.stats),
    },
    sizeGuide: {
      title: asString(sizeGuide.title, d.sizeGuide.title),
      subtitle: asString(sizeGuide.subtitle, d.sizeGuide.subtitle),
    },
    contact: {
      title: asString(contact.title, d.contact.title),
    },
  }
}

export function mergeSiteContent(raw: unknown): SiteContent {
  const d = DEFAULT_SITE_CONTENT
  const root = asRecord(raw)
  const brand = asRecord(root.brand)
  const footer = asRecord(root.footer)
  const promises = asRecord(root.productPromises)

  return {
    brand: {
      name: asString(brand.name, d.brand.name),
      tagline: asString(brand.tagline, d.brand.tagline),
      phone: asString(brand.phone, d.brand.phone),
      whatsapp: asString(brand.whatsapp, d.brand.whatsapp),
      email: asString(brand.email, d.brand.email),
      instagram: asString(brand.instagram, d.brand.instagram),
      instagramHandle: asString(brand.instagramHandle, d.brand.instagramHandle),
      facebook: asString(brand.facebook, d.brand.facebook),
      city: asString(brand.city, d.brand.city),
      followers: asString(brand.followers, d.brand.followers),
      recommend: asString(brand.recommend, d.brand.recommend),
    },
    footer: {
      blurb: asString(footer.blurb, d.footer.blurb),
      dropsTitle: asString(footer.dropsTitle, d.footer.dropsTitle),
      dropsBody: asString(footer.dropsBody, d.footer.dropsBody),
      dropsCtaLabel: asString(footer.dropsCtaLabel, d.footer.dropsCtaLabel),
      dropsPrefill: asString(footer.dropsPrefill, d.footer.dropsPrefill),
      copyright: asString(footer.copyright, d.footer.copyright),
    },
    productPromises: {
      deliveryLabel: asString(promises.deliveryLabel, d.productPromises.deliveryLabel),
      deliveryText: asString(promises.deliveryText, d.productPromises.deliveryText),
      returnsLabel: asString(promises.returnsLabel, d.productPromises.returnsLabel),
      returnsText: asString(promises.returnsText, d.productPromises.returnsText),
      authenticLabel: asString(
        promises.authenticLabel,
        d.productPromises.authenticLabel,
      ),
      authenticText: asString(
        promises.authenticText,
        d.productPromises.authenticText,
      ),
    },
  }
}

export function mergeSitePageContent(
  pageKey: SitePageKey,
  raw: unknown,
): HomePageContent | AboutPageContent | SiteContent {
  if (pageKey === 'home') return mergeHomeContent(raw)
  if (pageKey === 'about') return mergeAboutContent(raw)
  return mergeSiteContent(raw)
}
