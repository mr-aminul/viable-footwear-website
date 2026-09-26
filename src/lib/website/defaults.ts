import { BRAND } from '@/lib/brand'
import { DEFAULT_SLIDE_INTERVAL_MS } from '@/lib/website/constants'
import type {
  AboutPageContent,
  HomePageContent,
  SiteContent,
} from '@/lib/website/types'

export const DEFAULT_HOME_SECTIONS: HomePageContent['sections'] = {
  hero: true,
  categories: true,
  promoDual: true,
  mostPopular: true,
  foamCrocs: true,
  saleBanner: true,
  whatsapp: true,
  brandStrip: true,
  trust: true,
}

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  sections: { ...DEFAULT_HOME_SECTIONS },
  hero: {
    mediaMode: 'image',
    image: '/images/hero.png',
    video: '',
    slides: [
      { id: '1', src: '/images/hero.png', alt: 'Viable footwear' },
    ],
    slideIntervalMs: DEFAULT_SLIDE_INTERVAL_MS,
    logoSrc: '/logo.png',
    headlineBefore: 'Step into',
    headlineEm: 'everyday greatness',
    subcopy:
      "Casual foam, crocs & kicks made for Dhaka's Gen Z — light, loud, and built to live in.",
    primaryCta: { label: 'Shop now', href: '/shop' },
    secondaryCta: { label: 'Explore crocs', href: '/shop?category=crocs' },
    usps: ['Countrywide Delivery', 'Easy returns', 'COD available'],
  },
  categories: {
    title: 'Shop by category',
    subtitle: 'The silhouettes Dhaka lives in.',
  },
  promoDual: {
    left: {
      eyebrow: 'New arrivals',
      title: 'Fresh picks for everyday feet',
      cta: { label: 'Shop now', href: '/shop' },
      image: '/images/promos/promo-crocs-navy.png',
      bgColor: '#0f2248',
    },
    right: {
      eyebrow: 'Street energy',
      title: 'Sneakers made to be seen',
      cta: { label: 'Shop sneakers', href: '/shop?category=sneakers' },
      image: '/images/promos/promo-sneaker-red.png',
      bgColor: '#e31c23',
    },
  },
  mostPopular: {
    title: 'Most popular',
    subtitle: "What everyone's wearing right now.",
  },
  foamCrocs: {
    title: 'Foam & crocs',
    subtitle: 'Sculptural comfort for all-day Dhaka walks.',
  },
  saleBanner: {
    eyebrow: 'Limited drop',
    title: 'Autumn Sale',
    bodyBefore: 'Up to ',
    highlight: '40% off',
    bodyAfter: ' select foam & crocs',
    cta: { label: 'Shop the sale', href: '/shop?sale=1' },
    image: '/images/promo-autumn.png',
    bigText: '40%',
  },
  whatsapp: {
    title: 'Order on WhatsApp',
    body: "Send us your size and style — we'll confirm stock, quote delivery, and take your order in minutes.",
    primaryCtaLabel: 'WhatsApp to order',
    secondaryCta: { label: 'Browse the shop', href: '/shop' },
  },
  brandStrip: {
    eyebrow: 'Our space',
    title: 'Built for the way you actually walk',
    body: `No formal leather. No stiff dress shoes. Just soft foam, sculptural crocs, slides and street sneakers — curated for Bangladesh's most style-forward crowd. Trusted by ${BRAND.followers}+ on Facebook with a ${BRAND.recommend} recommend rate.`,
    cta: { label: 'Our story', href: '/about' },
    image: '/images/hero.png',
  },
  trust: [
    { title: '100% Authentic', text: 'Direct from Viable' },
    { title: 'Fast Delivery', text: 'Across greater Dhaka' },
    { title: 'Pay on delivery', text: 'COD available now' },
    { title: 'WhatsApp Order', text: BRAND.phone },
  ],
}

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  hero: {
    image: '/images/store.jpg',
    eyebrow: 'About us',
    title: 'Footwear that keeps up with Dhaka',
    subcopy:
      'Viable is a casual footwear brand for Gen Z — foam runners, crocs, slides and everyday sneakers. Soft underfoot. Sharp on the street.',
  },
  whoWeAre: {
    title: 'Who we are',
    body1: `Based in ${BRAND.city}, Viable exists for people who want comfort without compromising style. We skip formal leather and dress shoes — our racks are filled with sculptural foam, chunky sneakers, and easy slides you'll actually wear every day.`,
    body2: `With ${BRAND.followers}+ followers on Facebook and a ${BRAND.recommend} recommend rate from real customers, we've become a go-to stop for campus, café, and city-street fits.`,
    stats: [
      { value: BRAND.followers, label: 'Facebook followers' },
      { value: BRAND.recommend, label: 'Would recommend' },
      { value: '100%', label: 'Casual & lifestyle' },
      { value: '7-day', label: 'Easy exchange' },
    ],
  },
  sizeGuide: {
    title: 'Size guide',
    subtitle:
      'Same adult foot-length chart used on product pages (millimetres). Foam styles usually run true to size — when in doubt, size up.',
  },
  contact: {
    title: 'Get in touch',
  },
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: BRAND.name,
    tagline: BRAND.tagline,
    phone: BRAND.phone,
    whatsapp: BRAND.whatsapp,
    email: BRAND.email,
    instagram: BRAND.instagram,
    instagramHandle: '@viable.bd',
    facebook: BRAND.facebook,
    city: BRAND.city,
    followers: BRAND.followers,
    recommend: BRAND.recommend,
  },
  footer: {
    blurb:
      "Casual footwear for Dhaka's Gen Z. Foam runners, crocs, slides and everyday kicks — designed to move with you.",
    dropsTitle: 'Drops & restocks',
    dropsBody:
      'Message us on WhatsApp for early access to new styles and restocks.',
    dropsCtaLabel: 'WhatsApp us',
    dropsPrefill: 'Hi Viable — keep me posted on drops & restocks.',
    copyright: '© {year} Viable. Shop from Dhaka, deliver across the city.',
  },
  productPromises: {
    deliveryLabel: 'Delivery:',
    deliveryText: '24hrs within Dhaka, 48–72hrs outside Dhaka',
    returnsLabel: 'Free returns:',
    returnsText: '7-day return policy on unused pairs',
    authenticLabel: 'Authentic:',
    authenticText: 'Genuine footwear, curated for Bangladesh',
  },
}
