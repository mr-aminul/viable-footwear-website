import { NextRequest, NextResponse } from 'next/server'
import {
  isAllowedMediaBucket,
  publicStorageUrl,
} from '@/lib/media/storage-proxy'
import { parseMediaWidth } from '@/lib/media/resize'
import { mediaVariantObjectPath } from '@/lib/media/variants'

/** Long-lived CDN + browser cache so repeat visitors rarely hit origin storage. */
const CACHE_CONTROL =
  'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'

type RouteContext = {
  params: Promise<{ bucket: string; path: string[] }>
}

function cacheHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  headers.set('Cache-Control', CACHE_CONTROL)
  headers.set('CDN-Cache-Control', CACHE_CONTROL)
  // Cloudflare Free respects this even when path is /api/… (no file extension).
  headers.set('Cloudflare-CDN-Cache-Control', CACHE_CONTROL)
  return headers
}

async function fetchUpstream(
  url: string,
  range: string | null,
): Promise<Response> {
  const upstreamHeaders: HeadersInit = {}
  if (range) upstreamHeaders.Range = range

  // Full responses are Data-Cache'd; Range (video seek) bypasses that cache.
  return fetch(url, {
    headers: upstreamHeaders,
    ...(range
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 31536000 } }),
  })
}

/**
 * Same-origin media proxy. Browsers request `/api/media/…`; CDN (Cloudflare)
 * caches full responses for a year.
 *
 * Optional `?w=` serves a pre-built width variant from storage when present
 * (written at upload time). Never resizes on the request path — that kept
 * the VPS memory high. Missing variants fall back to the original object.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { bucket, path: pathParts } = await context.params

  if (!isAllowedMediaBucket(bucket)) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (
    !pathParts?.length ||
    pathParts.some((part) => part === '..' || part === '.' || part === '')
  ) {
    return new NextResponse('Not found', { status: 404 })
  }

  const objectPath = pathParts.map(decodeURIComponent).join('/')
  const width = parseMediaWidth(request.nextUrl.searchParams.get('w'))

  let servePath = objectPath
  if (width) {
    const variantPath = mediaVariantObjectPath(objectPath, width)
    const variantUrl = publicStorageUrl(bucket, variantPath)
    if (variantUrl) {
      // HEAD + no-store so a missing variant is never stuck in Next's data cache.
      const probe = await fetch(variantUrl, {
        method: 'HEAD',
        cache: 'no-store',
      })
      if (probe.ok) servePath = variantPath
    }
  }

  const upstream = publicStorageUrl(bucket, servePath)
  if (!upstream) {
    return new NextResponse('Storage is not configured', { status: 500 })
  }

  // Variants are always full objects; Range only for original (video).
  const range = width ? null : request.headers.get('range')
  const upstreamRes = await fetchUpstream(upstream, range)

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    return new NextResponse('Not found', {
      status: upstreamRes.status === 404 ? 404 : 502,
    })
  }

  const contentType =
    upstreamRes.headers.get('content-type') || 'application/octet-stream'

  const headers = cacheHeaders({ 'Content-Type': contentType })

  const acceptRanges = upstreamRes.headers.get('accept-ranges')
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges)

  const contentRange = upstreamRes.headers.get('content-range')
  if (contentRange) headers.set('Content-Range', contentRange)

  const contentLength = upstreamRes.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  })
}
