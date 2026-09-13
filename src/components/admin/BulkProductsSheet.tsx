'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import {
  bulkCreateProducts,
  type BulkProductRowInput,
} from '@/lib/catalog/actions/products'
import {
  DEFAULT_PRODUCT_BADGE,
  PRODUCT_BADGE_OPTIONS,
} from '@/lib/catalog/badge'
import { slugify } from '@/lib/catalog/slug'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import {
  AdminButton,
  FormError,
  FormSuccess,
} from '@/components/admin/ui'

type CategoryOption = { id: string; name: string }

type SheetColumn =
  | 'name'
  | 'slug'
  | 'category_id'
  | 'price'
  | 'compare_at'
  | 'weight_kg'
  | 'badge'
  | 'featured'
  | 'description'
  | 'size_eu'
  | 'color'
  | 'color_hex'
  | 'stock'
  | 'sku'

type SheetRow = {
  key: string
  name: string
  slug: string
  slugTouched: boolean
  category_id: string
  price: string
  compare_at: string
  weight_kg: string
  badge: string
  featured: boolean
  description: string
  size_eu: string
  color: string
  color_hex: string
  stock: string
  sku: string
  status: 'idle' | 'ok' | 'error'
  message?: string
  createdId?: string
}

const COLUMNS: Array<{
  key: SheetColumn
  label: string
  width: string
  kind: 'text' | 'number' | 'select' | 'checkbox'
}> = [
  { key: 'name', label: 'Name', width: 'minmax(11rem, 1.4fr)', kind: 'text' },
  { key: 'slug', label: 'Slug', width: 'minmax(9rem, 1fr)', kind: 'text' },
  {
    key: 'category_id',
    label: 'Category',
    width: 'minmax(8rem, 0.9fr)',
    kind: 'select',
  },
  { key: 'price', label: 'Price ৳', width: '6.5rem', kind: 'number' },
  { key: 'compare_at', label: 'Compare ৳', width: '6.5rem', kind: 'number' },
  { key: 'weight_kg', label: 'Weight kg', width: '6rem', kind: 'number' },
  { key: 'badge', label: 'Badge', width: '7.5rem', kind: 'select' },
  { key: 'featured', label: 'Featured', width: '5rem', kind: 'checkbox' },
  {
    key: 'description',
    label: 'Description',
    width: 'minmax(12rem, 1.6fr)',
    kind: 'text',
  },
  { key: 'size_eu', label: 'Size EU', width: '5.5rem', kind: 'number' },
  { key: 'color', label: 'Color', width: '7rem', kind: 'text' },
  { key: 'color_hex', label: 'Hex', width: '6.5rem', kind: 'text' },
  { key: 'stock', label: 'Stock', width: '5rem', kind: 'number' },
  { key: 'sku', label: 'SKU', width: '7rem', kind: 'text' },
]

const COLUMN_KEYS = COLUMNS.map((column) => column.key)

const INITIAL_BLANK_ROWS = 12

function createEmptyRow(): SheetRow {
  return {
    key: crypto.randomUUID(),
    name: '',
    slug: '',
    slugTouched: false,
    category_id: '',
    price: '',
    compare_at: '',
    weight_kg: '0.5',
    badge: DEFAULT_PRODUCT_BADGE,
    featured: false,
    description: '',
    size_eu: '40',
    color: '',
    color_hex: '#1A3668',
    stock: '0',
    sku: '',
    status: 'idle',
  }
}

function createBlankRows(count: number): SheetRow[] {
  return Array.from({ length: count }, () => createEmptyRow())
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function parseBoolCell(raw: string): boolean {
  const value = raw.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'y'
}

function isRowFilled(row: SheetRow): boolean {
  return Boolean(
    row.name.trim() ||
      row.slug.trim() ||
      row.price.trim() ||
      row.compare_at.trim() ||
      row.description.trim() ||
      row.color.trim() ||
      row.sku.trim() ||
      (row.stock.trim() && row.stock.trim() !== '0'),
  )
}

function resolveCategoryId(
  raw: string,
  categories: CategoryOption[],
): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const byId = categories.find((category) => category.id === trimmed)
  if (byId) return byId.id
  const byName = categories.find(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
  )
  return byName?.id ?? ''
}

function cellValue(row: SheetRow, column: SheetColumn): string {
  if (column === 'featured') return row.featured ? 'yes' : ''
  return String(row[column] ?? '')
}

function applyCellValue(
  row: SheetRow,
  column: SheetColumn,
  raw: string,
  categories: CategoryOption[],
): SheetRow {
  const value = raw.trim()

  switch (column) {
    case 'name': {
      const nextName = raw
      return {
        ...row,
        name: nextName,
        slug: row.slugTouched ? row.slug : slugify(nextName),
        status: 'idle',
        message: undefined,
      }
    }
    case 'slug':
      return {
        ...row,
        slug: raw,
        slugTouched: true,
        status: 'idle',
        message: undefined,
      }
    case 'category_id':
      return {
        ...row,
        category_id: resolveCategoryId(raw, categories),
        status: 'idle',
        message: undefined,
      }
    case 'badge': {
      const match = PRODUCT_BADGE_OPTIONS.find(
        (badge) => badge.toLowerCase() === value.toLowerCase(),
      )
      return {
        ...row,
        badge: match ?? DEFAULT_PRODUCT_BADGE,
        status: 'idle',
        message: undefined,
      }
    }
    case 'featured':
      return {
        ...row,
        featured: parseBoolCell(raw),
        status: 'idle',
        message: undefined,
      }
    case 'price':
    case 'compare_at':
    case 'weight_kg':
    case 'description':
    case 'size_eu':
    case 'color':
    case 'color_hex':
    case 'stock':
    case 'sku':
      return {
        ...row,
        [column]: raw,
        status: 'idle',
        message: undefined,
      }
    default:
      return row
  }
}

function toBulkInput(row: SheetRow): BulkProductRowInput {
  return {
    key: row.key,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: parseOptionalNumber(row.price),
    compare_at: parseOptionalNumber(row.compare_at),
    weight_kg: parseOptionalNumber(row.weight_kg),
    category_id: row.category_id || null,
    badge: row.badge,
    featured: row.featured,
    size_eu: parseOptionalNumber(row.size_eu),
    color: row.color,
    color_hex: row.color_hex,
    stock: parseOptionalNumber(row.stock),
    sku: row.sku,
  }
}

function parseClipboardGrid(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines.map((line) => line.split('\t'))
}

export function BulkProductsSheet({
  categories,
}: {
  categories: CategoryOption[]
}) {
  const [rows, setRows] = useState<SheetRow[]>(() =>
    createBlankRows(INITIAL_BLANK_ROWS),
  )
  const [focus, setFocus] = useState<{ row: number; col: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const cellRefs = useRef(new Map<string, HTMLElement>())

  const filledCount = useMemo(
    () => rows.filter((row) => isRowFilled(row)).length,
    [rows],
  )

  const gridTemplate = useMemo(
    () =>
      `2.5rem ${COLUMNS.map((column) => column.width).join(' ')} 2.5rem minmax(8rem, 0.8fr)`,
    [],
  )

  const setCellRef = useCallback(
    (rowIndex: number, colIndex: number, node: HTMLElement | null) => {
      const key = `${rowIndex}:${colIndex}`
      if (node) cellRefs.current.set(key, node)
      else cellRefs.current.delete(key)
    },
    [],
  )

  useEffect(() => {
    if (!focus) return
    const node = cellRefs.current.get(`${focus.row}:${focus.col}`)
    if (!node) return
    node.focus()
    if (
      node instanceof HTMLInputElement &&
      node.type !== 'checkbox' &&
      typeof node.select === 'function'
    ) {
      node.select()
    }
  }, [focus, rows.length])

  const updateRow = useCallback(
    (rowIndex: number, updater: (row: SheetRow) => SheetRow) => {
      setRows((current) =>
        current.map((row, index) => (index === rowIndex ? updater(row) : row)),
      )
    },
    [],
  )

  const ensureRowCapacity = useCallback((neededIndex: number) => {
    setRows((current) => {
      if (neededIndex < current.length) return current
      const extra = createBlankRows(neededIndex - current.length + 1)
      return [...current, ...extra]
    })
  }, [])

  const moveFocus = useCallback(
    (rowIndex: number, colIndex: number) => {
      const nextRow = Math.max(0, rowIndex)
      const nextCol = Math.min(COLUMN_KEYS.length - 1, Math.max(0, colIndex))
      ensureRowCapacity(nextRow)
      setFocus({ row: nextRow, col: nextCol })
    },
    [ensureRowCapacity],
  )

  const handlePaste = (
    event: ClipboardEvent,
    rowIndex: number,
    colIndex: number,
  ) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return

    event.preventDefault()
    const grid = parseClipboardGrid(text)
    if (grid.length === 0) return

    setRows((current) => {
      const next = [...current]
      const lastRowNeeded = rowIndex + grid.length - 1
      while (next.length <= lastRowNeeded) next.push(createEmptyRow())

      for (let r = 0; r < grid.length; r += 1) {
        const targetRowIndex = rowIndex + r
        let row = next[targetRowIndex]!
        const cells = grid[r]!
        for (let c = 0; c < cells.length; c += 1) {
          const targetCol = colIndex + c
          if (targetCol >= COLUMN_KEYS.length) break
          const column = COLUMN_KEYS[targetCol]!
          row = applyCellValue(row, column, cells[c] ?? '', categories)
        }
        next[targetRowIndex] = row
      }
      return next
    })

    setError(null)
    setSuccess(null)
  }

  const onCellKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    colIndex: number,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      moveFocus(rowIndex + 1, colIndex)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      if (event.shiftKey) {
        if (colIndex === 0) moveFocus(rowIndex - 1, COLUMN_KEYS.length - 1)
        else moveFocus(rowIndex, colIndex - 1)
      } else if (colIndex >= COLUMN_KEYS.length - 1) {
        moveFocus(rowIndex + 1, 0)
      } else {
        moveFocus(rowIndex, colIndex + 1)
      }
      return
    }
    if (
      event.key === 'ArrowDown' &&
      event.target instanceof HTMLInputElement &&
      event.target.type === 'text'
    ) {
      event.preventDefault()
      moveFocus(rowIndex + 1, colIndex)
      return
    }
    if (
      event.key === 'ArrowUp' &&
      event.target instanceof HTMLInputElement &&
      event.target.type === 'text'
    ) {
      event.preventDefault()
      moveFocus(rowIndex - 1, colIndex)
    }
  }

  const addRows = (count: number) => {
    setRows((current) => [...current, ...createBlankRows(count)])
  }

  const removeRow = (rowIndex: number) => {
    setRows((current) => {
      if (current.length <= 1) return createBlankRows(1)
      return current.filter((_, index) => index !== rowIndex)
    })
  }

  const clearEmptyRows = () => {
    setRows((current) => {
      const filled = current.filter((row) => isRowFilled(row))
      if (filled.length === 0) return createBlankRows(INITIAL_BLANK_ROWS)
      return [...filled, ...createBlankRows(3)]
    })
  }

  const publishSheet = () => {
    setError(null)
    setSuccess(null)

    const payload = rows.filter(isRowFilled).map(toBulkInput)
    if (payload.length === 0) {
      setError('Fill at least one product row before creating.')
      return
    }

    startTransition(async () => {
      const result = await bulkCreateProducts(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }

      const byKey = new Map(
        result.data!.results.map((item) => [item.key, item]),
      )

      setRows((current) => {
        const next = current.map((row) => {
          if (!isRowFilled(row)) return row
          const outcome = byKey.get(row.key)
          if (!outcome) return row
          if (outcome.ok) {
            return {
              ...row,
              status: 'ok' as const,
              message: 'Created',
              createdId: outcome.id,
            }
          }
          return {
            ...row,
            status: 'error' as const,
            message: outcome.error ?? 'Failed',
            createdId: undefined,
          }
        })

        const remaining = next.filter((row) => row.status !== 'ok')
        const blankPad =
          remaining.filter(isRowFilled).length === 0
            ? createBlankRows(INITIAL_BLANK_ROWS)
            : createBlankRows(2)
        return [...remaining.filter(isRowFilled), ...blankPad]
      })

      const created = result.data!.created
      const failed = result.data!.results.filter((item) => !item.ok).length
      if (created > 0 && failed === 0) {
        setSuccess(`Created ${created} product${created === 1 ? '' : 's'}.`)
      } else if (created > 0) {
        setSuccess(
          `Created ${created} product${created === 1 ? '' : 's'}. ${failed} row${failed === 1 ? '' : 's'} need fixes.`,
        )
      } else {
        setError('No products were created. Fix the highlighted rows and try again.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cloud bg-white px-4 py-3 text-[13px]">
        <p className="text-mute">
          Type directly in the sheet, or paste from Google Sheets / Excel.
          Tab / Enter moves like a spreadsheet. Each row creates one product
          with a starter size/color variant — add gallery photos afterward.
        </p>
        <p className="font-semibold text-ink">
          {filledCount} row{filledCount === 1 ? '' : 's'} ready
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cloud bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div
              className="sticky top-0 z-10 grid items-center gap-0 border-b border-cloud bg-mist/80 text-[11px] font-semibold uppercase tracking-wider text-mute backdrop-blur"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="px-2 py-3 text-center">#</div>
              {COLUMNS.map((column) => (
                <div key={column.key} className="px-2 py-3">
                  {column.label}
                </div>
              ))}
              <div className="px-2 py-3" />
              <div className="px-2 py-3">Status</div>
            </div>

            <div>
              {rows.map((row, rowIndex) => (
                <div
                  key={row.key}
                  className={[
                    'grid items-stretch gap-0 border-b border-cloud last:border-0',
                    row.status === 'error' ? 'bg-spark/[0.04]' : '',
                    row.status === 'ok' ? 'bg-navy/[0.03]' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div className="flex items-center justify-center px-2 text-[12px] text-mute">
                    {rowIndex + 1}
                  </div>

                  {COLUMNS.map((column, colIndex) => {
                    const common = {
                      onFocus: () => setFocus({ row: rowIndex, col: colIndex }),
                      onKeyDown: (
                        event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
                      ) => onCellKeyDown(event, rowIndex, colIndex),
                      onPaste: (event: ClipboardEvent<HTMLElement>) =>
                        handlePaste(event, rowIndex, colIndex),
                    }

                    if (column.kind === 'checkbox') {
                      return (
                        <div
                          key={column.key}
                          className="flex items-center justify-center border-l border-cloud/70 px-2"
                        >
                          <input
                            ref={(node) => setCellRef(rowIndex, colIndex, node)}
                            type="checkbox"
                            checked={row.featured}
                            aria-label={`Featured row ${rowIndex + 1}`}
                            className="h-4 w-4"
                            onChange={(event) =>
                              updateRow(rowIndex, (current) => ({
                                ...current,
                                featured: event.target.checked,
                                status: 'idle',
                                message: undefined,
                              }))
                            }
                            {...common}
                          />
                        </div>
                      )
                    }

                    if (column.key === 'category_id') {
                      return (
                        <div
                          key={column.key}
                          className="border-l border-cloud/70"
                        >
                          <select
                            ref={(node) => setCellRef(rowIndex, colIndex, node)}
                            value={row.category_id}
                            aria-label={`Category row ${rowIndex + 1}`}
                            className="h-full w-full bg-transparent px-2 py-2.5 text-[13px] text-ink outline-none focus:bg-navy/[0.04]"
                            onChange={(event) =>
                              updateRow(rowIndex, (current) =>
                                applyCellValue(
                                  current,
                                  'category_id',
                                  event.target.value,
                                  categories,
                                ),
                              )
                            }
                            {...common}
                          >
                            <option value="">—</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    }

                    if (column.key === 'badge') {
                      return (
                        <div
                          key={column.key}
                          className="border-l border-cloud/70"
                        >
                          <select
                            ref={(node) => setCellRef(rowIndex, colIndex, node)}
                            value={row.badge}
                            aria-label={`Badge row ${rowIndex + 1}`}
                            className="h-full w-full bg-transparent px-2 py-2.5 text-[13px] text-ink outline-none focus:bg-navy/[0.04]"
                            onChange={(event) =>
                              updateRow(rowIndex, (current) =>
                                applyCellValue(
                                  current,
                                  'badge',
                                  event.target.value,
                                  categories,
                                ),
                              )
                            }
                            {...common}
                          >
                            {PRODUCT_BADGE_OPTIONS.map((badge) => (
                              <option key={badge} value={badge}>
                                {badge}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={column.key}
                        className="border-l border-cloud/70"
                      >
                        <input
                          ref={(node) => setCellRef(rowIndex, colIndex, node)}
                          type={column.kind === 'number' ? 'number' : 'text'}
                          inputMode={
                            column.kind === 'number' ? 'decimal' : undefined
                          }
                          value={cellValue(row, column.key)}
                          placeholder={
                            column.key === 'name'
                              ? 'Product name'
                              : column.key === 'slug'
                                ? 'auto'
                                : undefined
                          }
                          aria-label={`${column.label} row ${rowIndex + 1}`}
                          className="h-full w-full bg-transparent px-2 py-2.5 text-[13px] text-ink outline-none placeholder:text-mute/60 focus:bg-navy/[0.04]"
                          onChange={(event) =>
                            updateRow(rowIndex, (current) =>
                              applyCellValue(
                                current,
                                column.key,
                                event.target.value,
                                categories,
                              ),
                            )
                          }
                          {...common}
                        />
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-center border-l border-cloud/70">
                    <button
                      type="button"
                      aria-label={`Remove row ${rowIndex + 1}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-mist hover:text-spark"
                      onClick={() => removeRow(rowIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center border-l border-cloud/70 px-2 text-[12px]">
                    {row.status === 'ok' && row.createdId ? (
                      <Link
                        href={`/admin/catalog/products/${row.createdId}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        Created · Edit
                      </Link>
                    ) : row.status === 'error' ? (
                      <span className="text-spark">{row.message}</span>
                    ) : isRowFilled(row) ? (
                      <span className="text-mute">Ready</span>
                    ) : (
                      <span className="text-mute/50">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminActionButton type="button" disabled={pending} onClick={publishSheet}>
          {pending
            ? 'Creating…'
            : filledCount > 0
              ? `Create ${filledCount} product${filledCount === 1 ? '' : 's'}`
              : 'Create products'}
        </AdminActionButton>
        <AdminActionButton
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => addRows(1)}
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add row
          </span>
        </AdminActionButton>
        <AdminActionButton
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => addRows(10)}
        >
          Add 10 rows
        </AdminActionButton>
        <AdminActionButton
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={clearEmptyRows}
        >
          Trim empty
        </AdminActionButton>
        <AdminButton href="/admin/catalog" variant="ghost">
          Back to products
        </AdminButton>
      </div>
    </div>
  )
}
