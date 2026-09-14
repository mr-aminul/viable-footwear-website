import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { StaffUsersPanel } from '@/components/admin/StaffUsersPanel'

export const metadata = {
  title: 'Staff users',
  robots: { index: false, follow: false },
}

export default async function UsersPage() {
  const session = await requireRole('admin')
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active, created_at')
    .order('created_at', { ascending: true })

  return (
    <StaffUsersPanel
      users={profiles ?? []}
      currentUserId={session.userId}
    />
  )
}
