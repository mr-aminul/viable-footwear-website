import type { NextRequest } from 'next/server'
import { publicRedirect } from '@/lib/http/public-origin'

/**
 * Legacy OAuth callback — password auth uses cookies directly.
 * Keep the route so old bookmarks do not 404.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next') ?? '/admin'
  const search = new URLSearchParams({
    error: 'auth_callback',
    next,
  })
  return publicRedirect(request, '/admin/login', `?${search}`)
}
