/**
 * Lightweight in-memory rate limiter for public API routes.
 * Per-instance on serverless (best-effort). Prefer Vercel WAF / Upstash later.
 */

import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/cache-headers'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const MAX_KEYS = 5_000

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

export function rateLimit(options: {
  key: string
  limit: number
  windowMs: number
}): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(options.key)

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k)
      }
      if (buckets.size >= MAX_KEYS) buckets.clear()
    }
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs })
    return {
      ok: true,
      remaining: options.limit - 1,
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    }
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return {
    ok: true,
    remaining: options.limit - existing.count,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

/** Returns a 429 response when the key is over limit; otherwise null. */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const result = rateLimit({
    key: `${scope}:${clientIp(request)}`,
    limit,
    windowMs,
  })
  if (result.ok) return null
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please try again shortly.' },
    {
      status: 429,
      headers: {
        ...NO_STORE_HEADERS,
        'Retry-After': String(result.retryAfterSec),
      },
    },
  )
}
