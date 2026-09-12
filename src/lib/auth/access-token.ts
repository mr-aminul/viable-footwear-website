/**
 * Edge-safe helpers to read the Supabase access token from request cookies
 * without calling the Auth API.
 */

const BASE64_PREFIX = 'base64-'

function supabaseStorageKey(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const host = new URL(url).hostname
    const ref = host.split('.')[0]
    return ref ? `sb-${ref}-auth-token` : null
  } catch {
    return null
  }
}

function fromBase64Url(value: string): string {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((value.length + 3) % 4)
  return atob(padded)
}

function decodeCookiePayload(raw: string): string | null {
  if (!raw.startsWith(BASE64_PREFIX)) return raw
  try {
    return fromBase64Url(raw.slice(BASE64_PREFIX.length))
  } catch {
    return null
  }
}

function combineAuthCookie(
  get: (name: string) => string | undefined,
  storageKey: string,
): string | null {
  const single = get(storageKey)
  if (single) return decodeCookiePayload(single)

  const parts: string[] = []
  for (let i = 0; ; i++) {
    const chunk = get(`${storageKey}.${i}`)
    if (!chunk) break
    parts.push(chunk)
  }
  if (parts.length === 0) return null
  return decodeCookiePayload(parts.join(''))
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
 * Read the current access token from a NextRequest / cookie store getter.
 * Returns null when signed out or cookies are unreadable.
 */
export function readAccessTokenInfo(
  getCookie: (name: string) => string | undefined,
): AccessTokenInfo | null {
  const storageKey = supabaseStorageKey()
  if (!storageKey) return null

  const raw = combineAuthCookie(getCookie, storageKey)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as {
      access_token?: unknown
      expires_at?: unknown
    }
    if (typeof parsed.access_token !== 'string' || !parsed.access_token) {
      return null
    }
    const jwt = readJwtPayload(parsed.access_token)
    const expiresAt =
      typeof parsed.expires_at === 'number'
        ? parsed.expires_at
        : jwt.exp

    return {
      accessToken: parsed.access_token,
      expiresAt,
      subject: jwt.sub,
    }
  } catch {
    return null
  }
}

/** True when the access token is present and not within `skewSeconds` of expiry. */
export function isAccessTokenFresh(
  info: AccessTokenInfo | null,
  skewSeconds = 120,
): boolean {
  if (!info?.accessToken || !info.expiresAt) return false
  return info.expiresAt > Date.now() / 1000 + skewSeconds
}
