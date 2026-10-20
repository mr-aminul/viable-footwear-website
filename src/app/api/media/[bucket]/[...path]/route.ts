import { NextRequest, NextResponse } from 'next/server'
import {
  isAllowedMediaBucket,
  publicStorageUrl,
} from '@/lib/media/storage-proxy'
import {
  canResizeContentType,
  parseMediaWidth,
  resizeMediaImage,
} from '@/lib/media/resize'

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
  headers.set('Vercel-CDN-Cache-Control', CACHE_CONTROL)
  return headers
}

/**
 * Same-origin media proxy. Browsers request `/api/media/…`; Vercel CDN caches
 * full responses for a year. Optional `?w=` serves a downscaled WebP variant
 * (also CDN-cached) so thumbs/cards do not download full product photos.
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
  const upstream = publicStorageUrl(bucket, objectPath)
  if (!upstream) {
    return new NextResponse('Storage is not configured', { status: 500 })
  }

  const width = parseMediaWidth(request.nextUrl.searchParams.get('w'))
  const range = width ? null : request.headers.get('range')
  const upstreamHeaders: HeadersInit = {}
  if (range) upstreamHeaders.Range = range

  // Full responses are Data-Cache'd; Range (video seek) bypasses that cache.
  const upstreamRes = await fetch(upstream, {
    headers: upstreamHeaders,
    ...(range
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 31536000 } }),
  })

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    return new NextResponse('Not found', {
      status: upstreamRes.status === 404 ? 404 : 502,
    })
  }

  const contentType =
    upstreamRes.headers.get('content-type') || 'application/octet-stream'

  if (width && canResizeContentType(contentType)) {
    const bytes = Buffer.from(await upstreamRes.arrayBuffer())
    try {
      const resized = await resizeMediaImage(bytes, width)
      return new NextResponse(new Uint8Array(resized.buffer), {
        status: 200,
        headers: cacheHeaders({
          'Content-Type': resized.contentType,
          'Content-Length': String(resized.buffer.byteLength),
        }),
      })
    } catch {
      // Serve the original bytes we already fetched.
      return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: cacheHeaders({
          'Content-Type': contentType,
          'Content-Length': String(bytes.byteLength),
        }),
      })
    }
  }

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
