import type { SitePageKey } from '@/lib/website/constants'

export type CtaLink = {
  label: string
  href: string
}

export type HeroSlide = {
  id: string
  src: string
  alt: string
}

export type HeroMediaMode = 'image' | 'video' | 'slideshow'

export type HomeHeroContent = {
  mediaMode: HeroMediaMode
  image: string
  video: string
  slides: HeroSlide[]
  slideIntervalMs: number
  logoSrc: string
  headlineBefore: string
  headlineEm: string
  subcopy: string
  primaryCta: CtaLink
  secondaryCta: CtaLink
  usps: string[]
}

export type PromoCardContent = {
  eyebrow: string
  title: string
  cta: CtaLink
  image: string
  bgColor: string
}

export type SaleBannerContent = {
  eyebrow: string
  title: string
  bodyBefore: string
  highlight: string
  bodyAfter: string
  cta: CtaLink
  image: string
  bigText: string
}

export type TrustItemContent = {
  title: string
  text: string
}

/** Homepage blocks that can be shown or hidden from the storefront. */
export type HomeSectionKey =
  | 'hero'
  | 'categories'
  | 'promoDual'
  | 'mostPopular'
  | 'foamCrocs'
  | 'saleBanner'
  | 'whatsapp'
  | 'brandStrip'
  | 'trust'

export type HomeSectionsVisibility = Record<HomeSectionKey, boolean>

export type HomePageContent = {
  sections: HomeSectionsVisibility
  hero: HomeHeroContent
  categories: { title: string; subtitle: string }
  promoDual: { left: PromoCardContent; right: PromoCardContent }
  mostPopular: { title: string; subtitle: string }
  foamCrocs: { title: string; subtitle: string }
  saleBanner: SaleBannerContent
  whatsapp: {
    title: string
    body: string
    primaryCtaLabel: string
    secondaryCta: CtaLink
  }
  brandStrip: {
    eyebrow: string
    title: string
    body: string
    cta: CtaLink
    image: string
  }
  trust: TrustItemContent[]
}

export type AboutStatContent = {
  value: string
  label: string
}

export type AboutPageContent = {
  hero: {
    image: string
    eyebrow: string
    title: string
    subcopy: string
  }
  whoWeAre: {
    title: string
    body1: string
    body2: string
    stats: AboutStatContent[]
  }
  sizeGuide: {
    title: string
    subtitle: string
  }
  contact: {
    title: string
  }
}

/** Global brand, footer, and product-page promises (Website → Site settings). */
export type SiteContent = {
  brand: {
    name: string
    tagline: string
    phone: string
    /** E.164 / wa.me digits, e.g. +8801805215181 */
    whatsapp: string
    email: string
    instagram: string
    /** Display handle, e.g. @viable.bd */
    instagramHandle: string
    facebook: string
    city: string
    followers: string
    recommend: string
  }
  footer: {
    blurb: string
    dropsTitle: string
    dropsBody: string
    dropsCtaLabel: string
    dropsPrefill: string
    /** Use {year} for the current year. */
    copyright: string
  }
  productPromises: {
    deliveryLabel: string
    deliveryText: string
    returnsLabel: string
    returnsText: string
    authenticLabel: string
    authenticText: string
  }
}

export type SitePageContentMap = {
  home: HomePageContent
  about: AboutPageContent
  site: SiteContent
}

export type SitePageContent<K extends SitePageKey = SitePageKey> =
  SitePageContentMap[K]
