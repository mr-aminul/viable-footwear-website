import type { MarketingPopupContent } from '@/lib/website/types'

const STORAGE_PREFIX = 'viable-marketing-popup'

/** Store / staging hosts — full URLs from these become path-only links. */
const OWN_SITE_HOSTS = new Set([
  'viable.inventivelab.bd',
  'viable.fashion',
])

export function marketingPopupStorageKey(campaignKey: string): string {
  return `${STORAGE_PREFIX}:${campaignKey || 'default'}`
}

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/\.+$/, '')
    .replace(/^www\./, '')
}

/**
 * Accept relative paths or full URLs from Viable domains.
 * `https://viable.inventivelab.bd/test` → `/test`
 * `https://viable.fashion/testpush` → `/testpush`
 * Other absolute URLs (http/https) are kept for external click-through.
 */
export function normalizeSiteHref(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  let candidate = trimmed
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    // Bare host/path pasted without a protocol.
    candidate = `https://${candidate}`
  }

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return trimmed
    }

    const host = normalizeHostname(url.hostname)
    if (OWN_SITE_HOSTS.has(host)) {
      const path = `${url.pathname}${url.search}${url.hash}`
      return path || '/'
    }

    return url.href
  } catch {
    return trimmed
  }
}

/** True when the popup should be eligible to show right now (ignoring dismiss state). */
export function isMarketingPopupLive(
  popup: MarketingPopupContent,
  now = new Date(),
): boolean {
  if (!popup.enabled) return false
  if (!popup.image.trim()) return false

  if (popup.startsAt) {
    const start = Date.parse(popup.startsAt)
    if (Number.isFinite(start) && now.getTime() < start) return false
  }

  if (popup.endsAt) {
    const end = Date.parse(popup.endsAt)
    if (Number.isFinite(end) && now.getTime() > end) return false
  }

  return true
}

/** Paths where we never interrupt the shopper with a marketing popup. */
export function shouldSkipMarketingPopup(pathname: string): boolean {
  if (pathname === '/checkout' || pathname.startsWith('/checkout/')) {
    return true
  }
  if (pathname === '/orders' || pathname.startsWith('/orders/')) {
    return true
  }
  return false
}

export function wasMarketingPopupDismissed(
  campaignKey: string,
  frequency: MarketingPopupContent['frequency'],
): boolean {
  if (typeof window === 'undefined') return true
  if (frequency === 'always') return false

  const key = marketingPopupStorageKey(campaignKey)
  try {
    if (frequency === 'session') {
      return window.sessionStorage.getItem(key) === '1'
    }
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function markMarketingPopupDismissed(
  campaignKey: string,
  frequency: MarketingPopupContent['frequency'],
): void {
  if (typeof window === 'undefined') return
  if (frequency === 'always') return

  const key = marketingPopupStorageKey(campaignKey)
  try {
    if (frequency === 'session') {
      window.sessionStorage.setItem(key, '1')
    } else {
      window.localStorage.setItem(key, '1')
    }
  } catch {
    // Ignore quota / private mode failures — popup may reappear.
  }
}

/** Convert `<input type="datetime-local">` value ↔ ISO for storage. */
export function toDatetimeLocalValue(iso: string): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(local: string): string {
  if (!local.trim()) return ''
  const ms = Date.parse(local)
  if (!Number.isFinite(ms)) return ''
  return new Date(ms).toISOString()
}
