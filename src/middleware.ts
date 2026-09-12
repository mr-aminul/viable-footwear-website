import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresh Supabase auth cookies and protect /admin routes (except login).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Allow local/dev without Supabase until env is configured
  if (!url || !anon) {
    if (
      request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')
    ) {
      const login = request.nextUrl.clone()
      login.pathname = '/admin/login'
      login.searchParams.set('error', 'missing_supabase_env')
      return NextResponse.redirect(login)
    }
    return supabaseResponse
  }

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

  const path = request.nextUrl.pathname
  const isAdminRoute = path.startsWith('/admin')
  const isLogin = path.startsWith('/admin/login')

  if (isAdminRoute && !isLogin) {
    if (!user) {
      const login = request.nextUrl.clone()
      login.pathname = '/admin/login'
      login.searchParams.set('next', path)
      return NextResponse.redirect(login)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.active || !['admin', 'manager'].includes(profile.role)) {
      const login = request.nextUrl.clone()
      login.pathname = '/admin/login'
      login.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(login)
    }

    if (path.startsWith('/admin/integrations') && profile.role !== 'admin') {
      const dash = request.nextUrl.clone()
      dash.pathname = '/admin'
      dash.searchParams.set('error', 'admin_only')
      return NextResponse.redirect(dash)
    }

    if (path.startsWith('/admin/users') && profile.role !== 'admin') {
      const dash = request.nextUrl.clone()
      dash.pathname = '/admin'
      dash.searchParams.set('error', 'admin_only')
      return NextResponse.redirect(dash)
    }
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
  matcher: ['/admin/:path*'],
}
