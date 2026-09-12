import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
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
  user: User
  profile: StaffProfile
}

/**
 * Returns the authenticated staff session or null.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !profile.active) return null
    if (profile.role !== 'admin' && profile.role !== 'manager') return null

    return { user, profile }
  } catch {
    return null
  }
}

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
