'use client'

import { useState } from 'react'
import { BulkOrdersSheet } from '@/components/admin/BulkOrdersSheet'
import { ManualOrderForm } from '@/components/admin/ManualOrderForm'
import type { OrderImportPickerProduct } from '@/lib/catalog/queries'

type Tab = 'sheet' | 'single'

export function OrdersImportClient({
  catalog,
}: {
  catalog: OrderImportPickerProduct[]
}) {
  const [tab, setTab] = useState<Tab>('sheet')

  return (
    <div className="mt-4 space-y-3">
      <div className="inline-flex rounded-lg border border-cloud bg-white p-0.5">
        <button
          type="button"
          onClick={() => setTab('sheet')}
          className={[
            'rounded-md px-3 py-1.5 text-[12px] font-semibold transition',
            tab === 'sheet'
              ? 'bg-navy text-white'
              : 'text-mute hover:text-ink',
          ].join(' ')}
        >
          Spreadsheet / CSV
        </button>
        <button
          type="button"
          onClick={() => setTab('single')}
          className={[
            'rounded-md px-3 py-1.5 text-[12px] font-semibold transition',
            tab === 'single'
              ? 'bg-navy text-white'
              : 'text-mute hover:text-ink',
          ].join(' ')}
        >
          Add one order
        </button>
      </div>

      {tab === 'sheet' ? (
        <BulkOrdersSheet catalog={catalog} />
      ) : (
        <ManualOrderForm catalog={catalog} />
      )}
    </div>
  )
}
