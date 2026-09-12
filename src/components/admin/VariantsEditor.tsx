'use client'

import { useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { Field, inputClassName } from '@/components/admin/ui'

export type VariantDraft = {
  key: string
  id?: string
  size_eu: string
  color: string
  color_hex: string
  sku: string
  stock: string
  active: boolean
}

export function createEmptyVariantDraft(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size_eu: '40',
    color: '',
    color_hex: '#1A3668',
    sku: '',
    stock: '0',
    active: true,
  }
}

export function buildVariantsPayload(rows: VariantDraft[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      size_eu: Number(row.size_eu),
      color: row.color || null,
      color_hex: row.color_hex || null,
      sku: row.sku || null,
      stock: Number(row.stock),
      active: row.active,
    })),
  )
}

function normalizeHex(value: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`
  return '#1A3668'
}

/**
 * Variant table — edits only; parent Save product persists.
 */
export function VariantsEditor({
  rows,
  onChange,
}: {
  rows: VariantDraft[]
  onChange: (rows: VariantDraft[]) => void
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-3 py-3">Size EU</th>
              <th className="px-3 py-3">Color</th>
              <th className="px-3 py-3">Swatch</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-cloud last:border-0">
                <td className="px-3 py-2">
                  <input
                    value={row.size_eu}
                    onChange={(e) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key
                            ? { ...r, size_eu: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.color}
                    onChange={(e) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key
                            ? { ...r, color: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className={inputClassName}
                    placeholder="Navy"
                  />
                </td>
                <td className="px-3 py-2">
                  <VariantColorSwatch
                    value={row.color_hex}
                    onChange={(hex) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key ? { ...r, color_hex: hex } : r,
                        ),
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.sku}
                    onChange={(e) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key ? { ...r, sku: e.target.value } : r,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={row.stock}
                    onChange={(e) =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key
                            ? { ...r, stock: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.active}
                    aria-label={row.active ? 'Active' : 'Inactive'}
                    onClick={() =>
                      onChange(
                        rows.map((r) =>
                          r.key === row.key
                            ? { ...r, active: !r.active }
                            : r,
                        ),
                      )
                    }
                    className={[
                      'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                      row.active ? 'bg-navy' : 'bg-cloud',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                        row.active ? 'translate-x-5' : 'translate-x-0',
                      ].join(' ')}
                    />
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    aria-label="Delete variant"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-spark transition hover:bg-spark/10"
                    onClick={() =>
                      onChange(rows.filter((r) => r.key !== row.key))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminActionButton
        type="button"
        variant="secondary"
        onClick={() => onChange([...rows, createEmptyVariantDraft()])}
      >
        Add variant
      </AdminActionButton>

      <Field
        label="Tip"
        hint="A product needs at least one active variant to stay published."
      >
        <span />
      </Field>
    </div>
  )
}

function VariantColorSwatch({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hex = normalizeHex(value)

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Pick color ${hex}`}
        title={hex}
        onClick={() => inputRef.current?.click()}
        className="h-9 w-9 rounded-full border-2 border-navy/20 transition hover:scale-105"
        style={{
          backgroundColor: hex,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
      />
    </div>
  )
}
