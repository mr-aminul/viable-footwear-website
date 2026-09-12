import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { getStaffSession } from '@/lib/auth/session'

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getStaffSession()
  const params = await searchParams

  return (
    <AdminShell>
      {params.error === 'admin_only' && (
        <div className="mb-4 rounded-xl border border-spark/30 bg-spark/10 px-4 py-3 text-[13px] text-spark">
          That area is Admin-only.
        </div>
      )}

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
        Dashboard
      </h1>
      <p className="mt-2 max-w-xl text-[14px] text-mute">
        Catalog CMS is live. Checkout, Pathao, and analytics land in later
        phases — see <code className="text-ink">docs/REQUIREMENTS.md</code>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Sales" value="—" hint="Phase 3" />
        <KpiCard title="Orders today" value="—" hint="Phase 2–3" />
        <KpiCard title="To ship" value="—" hint="Phase 3 logistics" />
      </div>

      <div className="mt-10 rounded-2xl border border-cloud bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink">Quick links</h2>
        <ul className="mt-3 space-y-2 text-[14px] text-mute">
          <li>
            <Link href="/admin/catalog" className="text-navy hover:underline">
              Catalog CMS
            </Link>
          </li>
          <li>
            <Link href="/" className="text-navy hover:underline">
              View storefront
            </Link>
          </li>
          {session?.profile.role === 'admin' && (
            <>
              <li>
                <Link href="/admin/integrations" className="text-navy hover:underline">
                  Integrations (Admin)
                </Link>
              </li>
              <li>
                <Link href="/admin/users" className="text-navy hover:underline">
                  Staff users (Admin)
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </AdminShell>
  )
}

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-cloud bg-white p-5 shadow-card">
      <p className="text-[12px] font-medium uppercase tracking-wider text-mute">
        {title}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-[12px] text-mute">{hint}</p>
    </div>
  )
}
