import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { listCampaignsAdmin } from '@/lib/campaigns/queries'
import {
  parseCampaignRules,
  ruleTypeLabel,
} from '@/lib/campaigns/rules'
import { AdminButton, AdminPageHeader, StatusPill } from '@/components/admin/ui'

export const metadata = {
  title: 'Campaigns',
  robots: { index: false, follow: false },
}

export default async function CampaignsPage() {
  await requireRole(['admin', 'manager'])
  const campaigns = await listCampaignsAdmin()

  return (
    <>
      <AdminPageHeader
        title="Campaigns"
        description="Delivery promotions applied after Pathao quote, before COD fee + round-up."
        actions={
          <AdminButton href="/admin/campaigns/new">New campaign</AdminButton>
        }
      />

      <div className="mt-8 overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Rule</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-mute">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => {
                const rules = parseCampaignRules(c.rules)
                return (
                  <tr key={c.id} className="border-b border-cloud last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/campaigns/${c.id}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-mute">
                      {rules ? ruleTypeLabel(rules.type) : '—'}
                    </td>
                    <td className="px-4 py-3">{c.priority}</td>
                    <td className="px-4 py-3">
                      <StatusPill active={c.active} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
