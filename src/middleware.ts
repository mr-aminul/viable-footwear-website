import { NextResponse, type NextRequest } from 'next/server'
import { isAdminPath } from '@/lib/admin/paths'
import {
  STAFF_SESSION_COOKIE,
  verifySessionToken,
} from '@/lib/db/session-token'

/**
 * Gate admin surfaces with the Viable staff JWT cookie (no Supabase Auth).
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLogin = path.startsWith('/admin/login')
  const needsAuth = isAdminPath(path) && !isLogin

  const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  const signedIn = Boolean(session)

  if (needsAuth && !signedIn) {
    const login = request.nextUrl.clone()
    login.pathname = '/admin/login'
    login.searchParams.set('next', path)
    return NextResponse.redirect(login)
  }

  if (isLogin && signedIn) {
    const dash = request.nextUrl.clone()
    dash.pathname = '/admin'
    dash.search = ''
    return NextResponse.redirect(dash)
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
