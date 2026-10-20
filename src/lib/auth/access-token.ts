/**
 * Edge-safe helpers to read the Viable staff session cookie
 * without calling the Auth API.
 */

import { STAFF_SESSION_COOKIE } from '@/lib/db/session-token'

function fromBase64Url(value: string): string {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((value.length + 3) % 4)
  return atob(padded)
}

export type AccessTokenInfo = {
  accessToken: string
  expiresAt: number | null
  subject: string | null
}

function readJwtPayload(accessToken: string): {
  sub: string | null
  exp: number | null
} {
  try {
    const segment = accessToken.split('.')[1]
    if (!segment) return { sub: null, exp: null }
    const json = fromBase64Url(segment)
    const payload = JSON.parse(json) as { sub?: unknown; exp?: unknown }
    return {
      sub: typeof payload.sub === 'string' ? payload.sub : null,
      exp: typeof payload.exp === 'number' ? payload.exp : null,
    }
  } catch {
    return { sub: null, exp: null }
  }
}

/**
 * Read the current staff session JWT from a cookie store getter.
 * Returns null when signed out or cookies are unreadable.
 */
export function readAccessTokenInfo(
  getCookie: (name: string) => string | undefined,
): AccessTokenInfo | null {
  const token = getCookie(STAFF_SESSION_COOKIE)
  if (!token) return null

  const jwt = readJwtPayload(token)
  return {
    accessToken: token,
    expiresAt: jwt.exp,
    subject: jwt.sub,
  }
}

/** True when the session token is present and not within `skewSeconds` of expiry. */
export function isAccessTokenFresh(
  info: AccessTokenInfo | null,
  skewSeconds = 120,
): boolean {
  if (!info?.accessToken || !info.expiresAt) return false
  return info.expiresAt > Date.now() / 1000 + skewSeconds
}
