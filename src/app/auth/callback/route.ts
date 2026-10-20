import { NextResponse } from 'next/server'

/**
 * Legacy OAuth callback — password auth uses cookies directly.
 * Keep the route so old bookmarks do not 404.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/admin'
  return NextResponse.redirect(`${origin}/admin/login?error=auth_callback&next=${encodeURIComponent(next)}`)
}
