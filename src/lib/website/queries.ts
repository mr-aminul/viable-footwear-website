import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/admin'
import type { SitePageKey } from '@/lib/website/constants'
import {
  mergeAboutContent,
  mergeHomeContent,
  mergeSiteContent,
} from '@/lib/website/merge'
import type {
  AboutPageContent,
  HomePageContent,
  SiteContent,
} from '@/lib/website/types'

export const SITE_PAGES_TAG = 'site-pages'

function pageTag(pageKey: SitePageKey) {
  return `site-page-${pageKey}`
}

async function fetchPageRaw(pageKey: SitePageKey): Promise<unknown> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('site_pages')
      .select('content')
      .eq('page_key', pageKey)
      .maybeSingle()
    if (error || !data) return {}
    return data.content ?? {}
  } catch {
    return {}
  }
}

const getHomeCached = unstable_cache(
  async () => mergeHomeContent(await fetchPageRaw('home')),
  ['site-page-home'],
  { tags: [SITE_PAGES_TAG, pageTag('home')], revalidate: 60 },
)

const getAboutCached = unstable_cache(
  async () => mergeAboutContent(await fetchPageRaw('about')),
  ['site-page-about'],
  { tags: [SITE_PAGES_TAG, pageTag('about')], revalidate: 60 },
)

const getSiteCached = unstable_cache(
  async () => mergeSiteContent(await fetchPageRaw('site')),
  ['site-page-site'],
  { tags: [SITE_PAGES_TAG, pageTag('site')], revalidate: 60 },
)

/** Storefront: cached home page content with defaults. */
export const getHomePageContent = cache(
  async (): Promise<HomePageContent> => getHomeCached(),
)

/** Storefront: cached about page content with defaults. */
export const getAboutPageContent = cache(
  async (): Promise<AboutPageContent> => getAboutCached(),
)

/** Storefront: brand, footer, and product promises. */
export const getSiteContent = cache(
  async (): Promise<SiteContent> => getSiteCached(),
)

/** Admin editor: always fresh. */
export async function getHomePageContentFresh(): Promise<HomePageContent> {
  return mergeHomeContent(await fetchPageRaw('home'))
}

export async function getAboutPageContentFresh(): Promise<AboutPageContent> {
  return mergeAboutContent(await fetchPageRaw('about'))
}

export async function getSiteContentFresh(): Promise<SiteContent> {
  return mergeSiteContent(await fetchPageRaw('site'))
}

export function sitePageCacheTag(pageKey: SitePageKey) {
  return pageTag(pageKey)
}
