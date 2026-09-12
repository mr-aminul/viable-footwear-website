import { requireRole } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Staff users',
  robots: { index: false, follow: false },
}

export default async function UsersPage() {
  await requireRole('admin')
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active, created_at')
    .order('created_at', { ascending: true })

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Staff users
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] text-mute">
        Create users in the Supabase Auth dashboard, then set{' '}
        <code className="text-ink">profiles.role</code> to{' '}
        <code className="text-ink">admin</code> or{' '}
        <code className="text-ink">manager</code>. Invite UI ships later.
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-mute">
                  No profiles yet. Apply the SQL migration and create your first
                  Auth user.
                </td>
              </tr>
            ) : (
              (profiles ?? []).map((p) => (
                <tr key={p.id} className="border-b border-cloud last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{p.email}</td>
                  <td className="px-4 py-3 text-mute">{p.full_name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{p.role}</td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <span className="text-navy">Active</span>
                    ) : (
                      <span className="text-spark">Disabled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
