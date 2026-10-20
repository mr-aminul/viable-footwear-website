'use server'

import { redirect } from 'next/navigation'
import { isAdminPath } from '@/lib/admin/paths'
import { createClient } from '@/lib/supabase/server'

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/admin')

  if (!email || !password) {
    redirect('/admin/login?error=missing_fields')
  }

  let errorMessage: string | null = null
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) errorMessage = error.message
  } catch {
    errorMessage = 'sign_in_unavailable'
  }

  if (errorMessage) {
    redirect(`/admin/login?error=${encodeURIComponent(errorMessage)}`)
  }

  redirect(isAdminPath(next) ? next : '/admin')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
