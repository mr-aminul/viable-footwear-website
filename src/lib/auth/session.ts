import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

export type StaffProfile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  active: boolean
}

export type StaffSession = {
  userId: string
  profile: StaffProfile
}

function readJwtSubject(accessToken: string): string | null {
  try {
    const segment = accessToken.split('.')[1]
    if (!segment) return null
    const json = Buffer.from(
      segment.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8')
    const payload = JSON.parse(json) as { sub?: unknown }
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/**
 * Per-request cached staff session.
 * Cookie JWT is read locally; PostgREST verifies the signature on the profiles read
 * (safe even when middleware skips getUser on a fresh token).
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null
  }

  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) return null

    const userId = readJwtSubject(accessToken)
    if (!userId) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active')
      .eq('id', userId)
      .maybeSingle()

    if (error || !profile || !profile.active) return null
    if (profile.role !== 'admin' && profile.role !== 'manager') return null

    return { userId, profile }
  } catch {
    return null
  }
})

/**
 * Ensures the current user has one of the allowed roles; otherwise redirects.
 */
export async function requireRole(
  allowed: UserRole | UserRole[],
): Promise<StaffSession> {
  const session = await getStaffSession()
  if (!session) {
    redirect('/admin/login')
  }
  const roles = Array.isArray(allowed) ? allowed : [allowed]
  if (!roles.includes(session.profile.role)) {
    redirect('/admin?error=admin_only')
  }
  return session
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}
