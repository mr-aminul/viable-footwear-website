import { NextRequest, NextResponse } from 'next/server'
import {
  isAllowedMediaBucket,
  publicStorageUrl,
} from '@/lib/media/storage-proxy'

type RouteContext = {
  params: Promise<{ bucket: string; path: string[] }>
}

/**
 * Legacy same-origin media URLs. Redirect to Supabase public storage so old
 * cached HTML / bookmarks do not stream bytes through a Vercel function.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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
  const target = publicStorageUrl(bucket, objectPath)

  if (target.startsWith('/api/media/')) {
    return new NextResponse('Storage is not configured', { status: 500 })
  }

  return NextResponse.redirect(target, 308)
}
