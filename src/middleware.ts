import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  isAccessTokenFresh,
  readAccessTokenInfo,
} from '@/lib/auth/access-token'
import { isAdminPath } from '@/lib/admin/paths'

/**
 * Refresh auth cookies and gate admin surfaces:
 * - classic /admin/* (except login)
 * - suffix pages like /product/[slug]/admin
 *
 * Fast path: if the access token is still fresh, skip the Auth API hop.
 * Slow path: call getUser() to refresh / validate when near expiry or missing.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const path = request.nextUrl.pathname
  const isLogin = path.startsWith('/admin/login')
  const needsAuth = isAdminPath(path) && !isLogin

  if (!url || !anon) {
    if (needsAuth) {
      const login = request.nextUrl.clone()
      login.pathname = '/admin/login'
      login.searchParams.set('error', 'missing_supabase_env')
      return NextResponse.redirect(login)
    }
    return NextResponse.next({ request })
  }

  const tokenInfo = readAccessTokenInfo((name) => request.cookies.get(name)?.value)
  const tokenFresh = isAccessTokenFresh(tokenInfo)

  // Fast path — no Auth network round-trip.
  if (tokenFresh) {
    if (isLogin) {
      const dash = request.nextUrl.clone()
      dash.pathname = '/admin'
      dash.search = ''
      return NextResponse.redirect(dash)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (needsAuth && !user) {
    const login = request.nextUrl.clone()
    login.pathname = '/admin/login'
    login.searchParams.set('next', path)
    return NextResponse.redirect(login)
  }

  if (isLogin && user) {
    const dash = request.nextUrl.clone()
    dash.pathname = '/admin'
    dash.search = ''
    return NextResponse.redirect(dash)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/product/:slug/admin'],
}
