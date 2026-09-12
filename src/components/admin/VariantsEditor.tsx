'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveProductVariants } from '@/lib/catalog/actions/products'
import {
  AdminButton,
  Field,
  FormError,
  FormSuccess,
  inputClassName,
} from '@/components/admin/ui'

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

function newDraft(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size_eu: '40',
    color: '',
    color_hex: '',
    sku: '',
    stock: '0',
    active: true,
  }
}

export function VariantsEditor({
  productId,
  initial,
}: {
  productId: string
  initial: VariantDraft[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<VariantDraft[]>(
    initial.length > 0 ? initial : [newDraft()],
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const payload = useMemo(
    () =>
      JSON.stringify(
        rows.map((row) => ({
          id: row.id,
          size_eu: Number(row.size_eu),
          color: row.color || null,
          color_hex: row.color_hex || null,
          sku: row.sku || null,
          stock: Number(row.stock),
          active: row.active,
        })),
      ),
    [rows],
  )

  const save = () => {
    setError(null)
    setSuccess(null)
    const formData = new FormData()
    formData.set('variants_json', payload)
    startTransition(async () => {
      const result = await saveProductVariants(productId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess('Variants saved.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="overflow-x-auto rounded-2xl border border-cloud bg-white">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-cloud bg-mist/50 text-[11px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-3 py-3">Size EU</th>
              <th className="px-3 py-3">Color</th>
              <th className="px-3 py-3">Hex</th>
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
                      setRows((prev) =>
                        prev.map((r) =>
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
                      setRows((prev) =>
                        prev.map((r) =>
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
                  <input
                    value={row.color_hex}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? { ...r, color_hex: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className={inputClassName}
                    placeholder="#1A3668"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.sku}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
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
                      setRows((prev) =>
                        prev.map((r) =>
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
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? { ...r, active: e.target.checked }
                            : r,
                        ),
                      )
                    }
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-spark hover:underline"
                    onClick={() =>
                      setRows((prev) => prev.filter((r) => r.key !== row.key))
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => setRows((prev) => [...prev, newDraft()])}
        >
          Add variant
        </AdminButton>
        <AdminButton type="button" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : 'Save variants'}
        </AdminButton>
      </div>

      <Field
        label="Tip"
        hint="A product can only be published when at least one variant is active."
      >
        <span />
      </Field>
    </div>
  )
}
