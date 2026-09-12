import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/auth/session'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Login page uses a nested route without this shell — handled via route group check
  return children
}

/** Shared authenticated shell for admin pages (imported by each page or a nested layout). */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession()
  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-svh flex-col bg-sand/40 lg:flex-row">
      <AdminNav profile={session.profile} />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-cloud bg-white px-4 py-3 lg:px-8">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
              Viable Ops
            </p>
            <p className="text-[14px] font-semibold text-ink">
              {session.profile.full_name || session.profile.email}
            </p>
          </div>
        </header>
        <div className="px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  )
}
