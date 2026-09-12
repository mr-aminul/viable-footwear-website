import { requireRole } from '@/lib/auth/session'

export const metadata = {
  title: 'Integrations',
  robots: { index: false, follow: false },
}

export default async function IntegrationsPage() {
  await requireRole('admin')

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Integrations
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] text-mute">
        Admin-only. Wire credentials in Vercel env for secrets; use this page in
        Phase 4 for toggles (GTM, Pixel, Nuport webhook). Payment & Pathao land
        in Phase 2.
      </p>

      <ul className="mt-8 space-y-3">
        {[
          { name: 'bKash', phase: 'Phase 2', status: 'Not configured' },
          { name: 'Nagad', phase: 'Phase 2', status: 'Not configured' },
          { name: 'Pathao Courier', phase: 'Phase 2', status: 'Not configured' },
          { name: 'Google Tag Manager', phase: 'Phase 4', status: 'Placeholder' },
          { name: 'Meta Pixel', phase: 'Phase 4', status: 'Placeholder' },
          { name: 'Nuport-like webhook', phase: 'Phase 4', status: 'Placeholder' },
        ].map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between rounded-xl border border-cloud bg-white px-4 py-4"
          >
            <div>
              <p className="text-[14px] font-semibold text-ink">{item.name}</p>
              <p className="text-[12px] text-mute">{item.phase}</p>
            </div>
            <span className="rounded-full bg-mist px-3 py-1 text-[11px] font-medium text-mute">
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
