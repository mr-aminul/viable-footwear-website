import { NextResponse, type NextRequest } from 'next/server'
import { isAdminPath } from '@/lib/admin/paths'
import {
  STAFF_SESSION_COOKIE,
  verifySessionToken,
} from '@/lib/db/session-token'
import { publicRedirect } from '@/lib/http/public-origin'

/** Gate admin surfaces with the Viable staff JWT cookie. */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLogin = path.startsWith('/admin/login')
  const needsAuth = isAdminPath(path) && !isLogin

  const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  const signedIn = Boolean(session)

  if (needsAuth && !signedIn) {
    const search = new URLSearchParams({ next: path })
    return publicRedirect(request, '/admin/login', `?${search}`)
  }

  if (isLogin && signedIn) {
    return publicRedirect(request, '/admin')
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/product/:slug/admin',
    '/product/:slug/admin/:path*',
  ],
}
