'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveRelatedProducts } from '@/lib/catalog/actions/products'
import { RELATED_PRODUCTS_DISPLAY_CAP } from '@/lib/catalog/constants'
import {
  AdminButton,
  FormError,
  FormSuccess,
  inputClassName,
} from '@/components/admin/ui'

type RelatedOption = {
  id: string
  name: string
  slug: string
  active: boolean
}

export function RelatedProductsPicker({
  productId,
  options,
  initialIds,
}: {
  productId: string
  options: RelatedOption[]
  initialIds: string[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(
    initialIds.filter((id) => id !== productId).slice(0, RELATED_PRODUCTS_DISPLAY_CAP),
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const byId = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options
      .filter((o) => o.id !== productId)
      .filter((o) => !selected.includes(o.id))
      .filter((o) =>
        !q
          ? true
          : o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [options, productId, query, selected])

  const save = () => {
    setError(null)
    setSuccess(null)
    const formData = new FormData()
    formData.set('related_ids_json', JSON.stringify(selected))
    startTransition(async () => {
      const result = await saveRelatedProducts(productId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess('Related products saved.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="rounded-2xl border border-cloud bg-white p-5">
        <p className="text-[13px] text-mute">
          Manual order wins on the PDP. If empty, storefront falls back to the
          same category. Cap: {RELATED_PRODUCTS_DISPLAY_CAP}.
        </p>

        <div className="mt-4 space-y-2">
          {selected.length === 0 ? (
            <p className="text-[14px] text-mute">No related products selected.</p>
          ) : (
            selected.map((id, index) => {
              const item = byId.get(id)
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-cloud px-3 py-2"
                >
                  <div>
                    <p className="text-[14px] font-medium text-ink">
                      {index + 1}. {item?.name ?? id}
                    </p>
                    <p className="text-[12px] text-mute">{item?.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-navy disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() =>
                        setSelected((prev) => {
                          const next = [...prev]
                          ;[next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ]
                          return next
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-navy disabled:opacity-40"
                      disabled={index === selected.length - 1}
                      onClick={() =>
                        setSelected((prev) => {
                          const next = [...prev]
                          ;[next[index + 1], next[index]] = [
                            next[index],
                            next[index + 1],
                          ]
                          return next
                        })
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-spark"
                      onClick={() =>
                        setSelected((prev) => prev.filter((x) => x !== id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products to add…"
            className={inputClassName}
          />
          <ul className="mt-2 divide-y divide-cloud rounded-xl border border-cloud">
            {matches.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">{item.name}</p>
                  <p className="text-[12px] text-mute">
                    {item.slug}
                    {!item.active ? ' · inactive' : ''}
                  </p>
                </div>
                <AdminButton
                  type="button"
                  variant="secondary"
                  disabled={selected.length >= RELATED_PRODUCTS_DISPLAY_CAP}
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(item.id) ? prev : [...prev, item.id],
                    )
                  }
                >
                  Add
                </AdminButton>
              </li>
            ))}
            {matches.length === 0 ? (
              <li className="px-3 py-4 text-[13px] text-mute">No matches.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <AdminButton type="button" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : 'Save related products'}
      </AdminButton>
    </div>
  )
}
