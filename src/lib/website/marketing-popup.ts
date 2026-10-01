import type { MarketingPopupContent } from '@/lib/website/types'

const STORAGE_PREFIX = 'viable-marketing-popup'

export function marketingPopupStorageKey(campaignKey: string): string {
  return `${STORAGE_PREFIX}:${campaignKey || 'default'}`
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
