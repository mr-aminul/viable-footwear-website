import { NextRequest, NextResponse } from 'next/server'
import { isAllowedMediaBucket } from '@/lib/media/storage-proxy'

/** Long-lived CDN + browser cache so repeat visitors rarely hit Supabase. */
const CACHE_CONTROL =
  'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'

type RouteContext = {
  params: Promise<{ bucket: string; path: string[] }>
}

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

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) {
    return new NextResponse('Storage is not configured', { status: 500 })
  }

  const objectPath = pathParts.map(decodeURIComponent).join('/')
  const upstream = `${base}/storage/v1/object/public/${bucket}/${objectPath}`

  const range = request.headers.get('range')
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

  const headers = new Headers()
  const contentType =
    upstreamRes.headers.get('content-type') || 'application/octet-stream'
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', CACHE_CONTROL)
  headers.set('CDN-Cache-Control', CACHE_CONTROL)
  headers.set('Vercel-CDN-Cache-Control', CACHE_CONTROL)

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
