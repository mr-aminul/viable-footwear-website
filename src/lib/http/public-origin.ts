import { NextResponse, type NextRequest } from 'next/server'

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null
  return value.split(',')[0]?.trim() || null
}

function isLoopbackHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
}

/**
 * Public origin for absolute redirects behind Caddy/Cloudflare.
 * Upstream dials localhost:3000, so request.nextUrl.origin is wrong in prod.
 */
export function publicOrigin(request: NextRequest): string | null {
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'))
  const host = forwardedHost || firstHeaderValue(request.headers.get('host'))
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'))

  if (host && !isLoopbackHost(host)) {
    const proto = forwardedProto || 'https'
    return `${proto}://${host}`
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (site) {
    try {
      if (!isLoopbackHost(new URL(site).host)) return site
    } catch {
      /* ignore invalid SITE_URL */
    }
  }

  if (!isLoopbackHost(request.nextUrl.host)) {
    return request.nextUrl.origin
  }

  return null
}

/** Redirect that keeps the browser on the public hostname (not localhost:3000). */
export function publicRedirect(
  request: NextRequest,
  pathname: string,
  search = '',
): NextResponse {
  // Next middleware requires an absolute Location; relative ones throw Invalid URL.
  const origin = publicOrigin(request) ?? request.nextUrl.origin
  const url = new URL(pathname, origin)
  url.search = search.startsWith('?') ? search.slice(1) : search
  return NextResponse.redirect(url, 307)
}
