import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/db/database.types'
import { createClient } from '@/lib/db/server'
import { isDbConfigured } from '@/lib/db/postgrest'

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

/**
 * Per-request cached staff session (JWT cookie + profiles row on VPS).
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  if (!isDbConfigured()) return null

  try {
    const db = await createClient()
    const {
      data: { session },
    } = await db.auth.getSession()
    if (!session?.user?.id) return null

    const { data: profile, error } = await db
      .from('profiles')
      .select('id, email, full_name, role, active')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error || !profile || !profile.active) return null
    if (profile.role !== 'admin' && profile.role !== 'manager') return null

    return {
      userId: session.user.id,
      profile: profile as StaffProfile,
    }
  } catch {
    return null
  }
})

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
