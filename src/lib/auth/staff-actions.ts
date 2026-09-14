'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/catalog/types'
import type { UserRole } from '@/lib/supabase/database.types'
import { createServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ROLES: UserRole[] = ['admin', 'manager']
const MIN_PASSWORD_LENGTH = 8

function isUserRole(value: string): value is UserRole {
  return ROLES.includes(value as UserRole)
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

async function countActiveAdmins(
  supabase: ReturnType<typeof createServiceClient>,
  exceptUserId?: string,
) {
  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('active', true)

  if (exceptUserId) {
    query = query.neq('id', exceptUserId)
  }

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function createStaffUser(input: {
  email: string
  fullName: string
  role: UserRole
  password: string
}): Promise<ActionResult<{ id: string }>> {
  await requireRole('admin')

  const email = normalizeEmail(input.email)
  const fullName = input.fullName.trim()
  const password = input.password
  const role = input.role

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (!isUserRole(role)) {
    return { ok: false, error: 'Choose a valid role.' }
  }
  const passwordError = validatePassword(password)
  if (passwordError) return { ok: false, error: passwordError }

  try {
    const admin = createServiceClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    })

    if (error || !data.user) {
      return {
        ok: false,
        error: error?.message ?? 'Could not create the staff account.',
      }
    }

    // Ensure profile matches the chosen role/name even if metadata casting fails.
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        email,
        full_name: fullName || null,
        role,
        active: true,
      })
      .eq('id', data.user.id)

    if (profileError) {
      return {
        ok: false,
        error: `Account created, but profile update failed: ${profileError.message}`,
      }
    }

    revalidatePath('/admin/users')
    return { ok: true, data: { id: data.user.id } }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not create the staff account.',
    }
  }
}

export async function updateStaffRole(input: {
  userId: string
  role: UserRole
}): Promise<ActionResult> {
  const session = await requireRole('admin')
  const { userId, role } = input

  if (!userId) return { ok: false, error: 'Missing user id.' }
  if (!isUserRole(role)) return { ok: false, error: 'Choose a valid role.' }

  try {
    const supabase = await createClient()
    const { data: target, error: loadError } = await supabase
      .from('profiles')
      .select('id, role, active')
      .eq('id', userId)
      .maybeSingle()

    if (loadError || !target) {
      return { ok: false, error: loadError?.message ?? 'Staff user not found.' }
    }

    if (target.role === role) return { ok: true }

    const demotingAdmin =
      target.role === 'admin' && role === 'manager' && target.active

    if (demotingAdmin) {
      const admin = createServiceClient()
      const remainingAdmins = await countActiveAdmins(admin, userId)
      if (remainingAdmins < 1) {
        return {
          ok: false,
          error: 'Keep at least one active admin account.',
        }
      }
    }

    if (session.userId === userId && role !== 'admin') {
      return {
        ok: false,
        error: 'You cannot remove your own admin role while signed in.',
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/users')
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not update role.',
    }
  }
}

export async function updateStaffActive(input: {
  userId: string
  active: boolean
}): Promise<ActionResult> {
  const session = await requireRole('admin')
  const { userId, active } = input

  if (!userId) return { ok: false, error: 'Missing user id.' }
  if (session.userId === userId && !active) {
    return { ok: false, error: 'You cannot disable your own account.' }
  }

  try {
    const supabase = await createClient()
    const { data: target, error: loadError } = await supabase
      .from('profiles')
      .select('id, role, active')
      .eq('id', userId)
      .maybeSingle()

    if (loadError || !target) {
      return { ok: false, error: loadError?.message ?? 'Staff user not found.' }
    }

    if (target.active === active) return { ok: true }

    if (target.role === 'admin' && target.active && !active) {
      const admin = createServiceClient()
      const remainingAdmins = await countActiveAdmins(admin, userId)
      if (remainingAdmins < 1) {
        return {
          ok: false,
          error: 'Keep at least one active admin account.',
        }
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', userId)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/users')
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not update status.',
    }
  }
}

export async function setStaffPassword(input: {
  userId: string
  password: string
}): Promise<ActionResult> {
  await requireRole('admin')
  const { userId, password } = input

  if (!userId) return { ok: false, error: 'Missing user id.' }
  const passwordError = validatePassword(password)
  if (passwordError) return { ok: false, error: passwordError }

  try {
    const admin = createServiceClient()
    const { data: profile, error: loadError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (loadError || !profile) {
      return { ok: false, error: loadError?.message ?? 'Staff user not found.' }
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
    })

    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/users')
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not set password.',
    }
  }
}
