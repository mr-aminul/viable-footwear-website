'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'viable_visitor_id'

function getOrCreateVisitorKey(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim()
    if (existing && /^[A-Za-z0-9_-]{8,80}$/.test(existing)) {
      return existing
    }
  } catch {
    // private mode / blocked storage
  }

  const key =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`

  try {
    window.localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // still send this session's key
  }
  return key
}

/**
 * Fires once per storefront load so admin can show unique visitor counts.
 * Failures are silent — never block shopping.
 */
export function VisitorBeacon() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.navigator?.webdriver) return

    const visitorKey = getOrCreateVisitorKey()
    const body = JSON.stringify({ visitor_key: visitorKey })

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/visit', blob)
        return
      }
    } catch {
      // fall through to fetch
    }

    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }, [])

  return null
}
