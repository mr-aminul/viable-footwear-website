'use server'

import { randomUUID } from 'crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { CAMPAIGNS_ANNOUNCEMENT_TAG } from '@/lib/campaigns/queries'
import { optimizeProductImage } from '@/lib/catalog/optimize-image'
import type { ActionResult } from '@/lib/catalog/types'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import {
  SITE_ALLOWED_IMAGE_TYPES,
  SITE_ALLOWED_VIDEO_TYPES,
  SITE_IMAGE_MAX_BYTES,
  SITE_MEDIA_BUCKET,
  SITE_PAGE_KEYS,
  SITE_VIDEO_MAX_BYTES,
  type SitePageKey,
} from '@/lib/website/constants'
import { mergeAboutContent, mergeHomeContent, mergeSiteContent } from '@/lib/website/merge'
import {
  SITE_PAGES_TAG,
  sitePageCacheTag,
} from '@/lib/website/queries'
import type {
  AboutPageContent,
  HomePageContent,
  SiteContent,
} from '@/lib/website/types'

function isSitePageKey(value: string): value is SitePageKey {
  return (SITE_PAGE_KEYS as string[]).includes(value)
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  if (type === 'video/webm') return 'webm'
  if (type === 'video/mp4') return 'mp4'
  return 'jpg'
}

function revalidateSitePage(pageKey: SitePageKey) {
  revalidateTag(SITE_PAGES_TAG)
  revalidateTag(sitePageCacheTag(pageKey))
  revalidatePath('/admin/website')
  revalidatePath(`/admin/website/${pageKey === 'site' ? 'site' : pageKey}`)
  if (pageKey === 'home') revalidatePath('/')
  if (pageKey === 'about') revalidatePath('/about')
  if (pageKey === 'site') {
    revalidatePath('/', 'layout')
    revalidatePath('/about')
    revalidatePath('/terms')
    revalidatePath('/privacy')
    revalidateTag(CAMPAIGNS_ANNOUNCEMENT_TAG)
  }
}

export async function saveHomePageContent(
  content: HomePageContent,
): Promise<ActionResult> {
  const session = await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const merged = mergeHomeContent(content)

  const { error } = await supabase.from('site_pages').upsert({
    page_key: 'home',
    content: merged as unknown as Json,
    updated_by: session.profile.id,
  })

  if (error) {
    return { ok: false, error: error.message || 'Could not save home page.' }
  }

  revalidateSitePage('home')
  return { ok: true }
}

export async function saveAboutPageContent(
  content: AboutPageContent,
): Promise<ActionResult> {
  const session = await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const merged = mergeAboutContent(content)

  const { error } = await supabase.from('site_pages').upsert({
    page_key: 'about',
    content: merged as unknown as Json,
    updated_by: session.profile.id,
  })

  if (error) {
    return { ok: false, error: error.message || 'Could not save about page.' }
  }

  revalidateSitePage('about')
  return { ok: true }
}

export async function saveSiteContent(
  content: SiteContent,
): Promise<ActionResult> {
  const session = await requireRole(['admin', 'manager'])
  const supabase = await createClient()
  const merged = mergeSiteContent(content)

  const { error } = await supabase.from('site_pages').upsert({
    page_key: 'site',
    content: merged as unknown as Json,
    updated_by: session.profile.id,
  })

  if (error) {
    return { ok: false, error: error.message || 'Could not save site settings.' }
  }

  revalidateSitePage('site')
  return { ok: true }
}

/**
 * Upload an image or video for Website Modifier. Returns a storage path
 * (not a full URL) suitable for storing in site_pages content.
 */
export async function uploadSiteMedia(
  pageKey: string,
  formData: FormData,
): Promise<ActionResult<{ path: string; mediaType: 'image' | 'video' }>> {
  await requireRole(['admin', 'manager'])
  if (!isSitePageKey(pageKey)) {
    return { ok: false, error: 'Unknown page.' }
  }

  const supabase = await createClient()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose a file to upload.' }
  }

  const isVideo = file.type.startsWith('video/')
  const mediaType = isVideo ? 'video' : 'image'

  if (isVideo) {
    if (!(SITE_ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, error: 'Video must be MP4 or WebM.' }
    }
    if (file.size > SITE_VIDEO_MAX_BYTES) {
      return {
        ok: false,
        error: 'Video must be 24MB or smaller. Compress it first.',
      }
    }
  } else {
    if (!(SITE_ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, error: 'Image must be JPEG, PNG, WebP, or GIF.' }
    }
    if (file.size > SITE_IMAGE_MAX_BYTES) {
      return { ok: false, error: 'Image must be 20MB or smaller.' }
    }
  }

  let bytes = Buffer.from(await file.arrayBuffer())
  let contentType = file.type
  let ext = extensionFor(file.type)

  if (!isVideo && file.type !== 'image/gif') {
    try {
      const optimized = await optimizeProductImage(bytes, file.type)
      if (optimized) {
        bytes = Buffer.from(optimized.buffer)
        contentType = optimized.contentType
        ext = optimized.extension
      }
    } catch {
      // Keep original if optimize fails
    }
  }

  const objectPath = `${pageKey}/${randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(objectPath, bytes, {
      contentType,
      upsert: false,
    })

  if (error) {
    return { ok: false, error: error.message || 'Upload failed.' }
  }

  return { ok: true, data: { path: objectPath, mediaType } }
}
