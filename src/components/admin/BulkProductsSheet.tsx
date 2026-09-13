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
import type { ProductBadge } from '@/lib/catalog/constants'
import { slugify } from '@/lib/catalog/slug'
import { AdminActionButton } from '@/components/admin/AdminActionButton'
import { BadgePicker } from '@/components/admin/BadgePicker'
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
  | 'sizes'
  | 'colors'
  | 'stock'

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
  sizes: string
  colors: string
  stock: string
  status: 'idle' | 'ok' | 'error'
  message?: string
  createdId?: string
}

/**
 * Fixed track sizes (no fr). Spreadsheet grids must not let inputs inflate
 * columns past the header — use minmax(0, …) so cells can shrink.
 */
const COLUMNS: Array<{
  key: SheetColumn
  label: string
  width: string
  kind: 'text' | 'number' | 'select' | 'checkbox'
  placeholder?: string
}> = [
  {
    key: 'name',
    label: 'Name',
    width: 'minmax(0, 12rem)',
    kind: 'text',
    placeholder: 'Product name',
  },
  {
    key: 'slug',
    label: 'Slug',
    width: 'minmax(0, 10rem)',
    kind: 'text',
    placeholder: 'auto',
  },
  {
    key: 'category_id',
    label: 'Category',
    width: 'minmax(0, 9rem)',
    kind: 'select',
  },
  { key: 'price', label: 'Price ৳', width: 'minmax(0, 6.5rem)', kind: 'number' },
  {
    key: 'compare_at',
    label: 'Compare ৳',
    width: 'minmax(0, 6.5rem)',
    kind: 'number',
  },
  {
    key: 'weight_kg',
    label: 'Weight kg',
    width: 'minmax(0, 6rem)',
    kind: 'number',
    placeholder: '0.5',
  },
  { key: 'badge', label: 'Badge', width: 'minmax(0, 8.5rem)', kind: 'select' },
  {
    key: 'featured',
    label: 'Featured',
    width: 'minmax(0, 5rem)',
    kind: 'checkbox',
  },
  {
    key: 'description',
    label: 'Description',
    width: 'minmax(0, 14rem)',
    kind: 'text',
  },
  {
    key: 'sizes',
    label: 'Sizes',
    width: 'minmax(0, 11rem)',
    kind: 'text',
    placeholder: '40, 41, 42',
  },
  {
    key: 'colors',
    label: 'Colors',
    width: 'minmax(0, 12rem)',
    kind: 'text',
    placeholder: 'Black, White',
  },
  {
    key: 'stock',
    label: 'Stock each',
    width: 'minmax(0, 6rem)',
    kind: 'number',
    placeholder: '0',
  },
]

const cellShellClassName = 'min-w-0 overflow-hidden border-l border-cloud/70'
const cellControlClassName =
  'h-full w-full min-w-0 bg-transparent px-2 py-2.5 text-[13px] text-ink outline-none focus:bg-navy/[0.04]'

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
    weight_kg: '',
    badge: DEFAULT_PRODUCT_BADGE,
    featured: false,
    description: '',
    sizes: '',
    colors: '',
    stock: '',
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
      row.weight_kg.trim() ||
      row.description.trim() ||
      row.category_id.trim() ||
      row.featured ||
      row.sizes.trim() ||
      row.colors.trim() ||
      row.stock.trim(),
  )
}

function countListItems(raw: string): number {
  return raw
    .split(/[,|/;]+/)
    .map((part) => part.trim())
    .filter(Boolean).length
}

/** Live preview of how many variants this row will create. */
function previewVariantCount(row: SheetRow): number {
  const sizes = Math.max(1, countListItems(row.sizes))
  const colors = Math.max(1, countListItems(row.colors))
  return sizes * colors
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
    case 'sizes':
    case 'colors':
    case 'stock':
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
    sizes: row.sizes,
    colors: row.colors,
    stock: parseOptionalNumber(row.stock),
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

  const productCount = useMemo(
    () => rows.filter((row) => row.name.trim()).length,
    [rows],
  )

  const gridTemplate = useMemo(
    () =>
      `2.5rem ${COLUMNS.map((column) => column.width).join(' ')} 2.5rem minmax(0, 10rem)`,
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

    const payload = rows.filter((row) => row.name.trim()).map(toBulkInput)
    if (payload.length === 0) {
      setError('Add a product name on at least one row.')
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
          if (!row.name.trim()) return row
          const outcome = byKey.get(row.key)
          if (!outcome) return row
          if (outcome.ok) {
            const variants = outcome.variantCount ?? 0
            return {
              ...row,
              status: 'ok' as const,
              message:
                variants > 1
                  ? `Created · ${variants} variants`
                  : 'Created',
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
          remaining.filter((row) => row.name.trim()).length === 0
            ? createBlankRows(INITIAL_BLANK_ROWS)
            : createBlankRows(2)
        return [
          ...remaining.filter((row) => isRowFilled(row)),
          ...blankPad,
        ]
      })

      const created = result.data!.created
      const failed = result.data!.results.filter((item) => !item.ok).length
      const variantTotal = result.data!.results
        .filter((item) => item.ok)
        .reduce((sum, item) => sum + (item.variantCount ?? 0), 0)

      if (created > 0 && failed === 0) {
        setSuccess(
          `Created ${created} product${created === 1 ? '' : 's'} (${variantTotal} variant${variantTotal === 1 ? '' : 's'}).`,
        )
      } else if (created > 0) {
        setSuccess(
          `Created ${created} product${created === 1 ? '' : 's'}. ${failed} row${failed === 1 ? '' : 's'} need fixes.`,
        )
      } else {
        setError(
          'No products were created. Fix the highlighted rows and try again.',
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cloud bg-white px-4 py-3 text-[13px]">
        <p className="text-mute">
          <span className="font-medium text-ink">One row = one product.</span>{' '}
          Type sizes like <span className="font-medium text-ink">40, 41, 42</span>{' '}
          and colors like{' '}
          <span className="font-medium text-ink">Black, White</span> — we create
          every combination for you. Same stock applies to each variant; tweak
          individually later on the product page.
        </p>
        <p className="shrink-0 font-semibold text-ink">
          {productCount} product{productCount === 1 ? '' : 's'} ready
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cloud bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <div className="w-max min-w-full">
            <div
              className="sticky top-0 z-10 grid items-center gap-0 border-b border-cloud bg-mist/80 text-[11px] font-semibold uppercase tracking-wider text-mute backdrop-blur"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="px-2 py-3 text-center">#</div>
              {COLUMNS.map((column) => (
                <div
                  key={column.key}
                  className={`${cellShellClassName} truncate px-2 py-3`}
                >
                  {column.label}
                </div>
              ))}
              <div className={cellShellClassName} />
              <div className={`${cellShellClassName} truncate px-2 py-3`}>
                Status
              </div>
            </div>

            <div>
              {rows.map((row, rowIndex) => {
                const hasName = Boolean(row.name.trim())
                const variantPreview = hasName ? previewVariantCount(row) : 0

                return (
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
                        onFocus: () =>
                          setFocus({ row: rowIndex, col: colIndex }),
                        onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
                          onCellKeyDown(event, rowIndex, colIndex),
                        onPaste: (event: ClipboardEvent<HTMLElement>) =>
                          handlePaste(event, rowIndex, colIndex),
                      }

                      if (column.kind === 'checkbox') {
                        return (
                          <div
                            key={column.key}
                            className={`flex items-center justify-center px-2 ${cellShellClassName}`}
                          >
                            <input
                              ref={(node) =>
                                setCellRef(rowIndex, colIndex, node)
                              }
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
                          <div key={column.key} className={cellShellClassName}>
                            <select
                              ref={(node) =>
                                setCellRef(rowIndex, colIndex, node)
                              }
                              value={row.category_id}
                              aria-label={`Category row ${rowIndex + 1}`}
                              className={cellControlClassName}
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
                            className={`flex items-center px-2 ${cellShellClassName}`}
                            onPaste={common.onPaste}
                          >
                            <BadgePicker
                              compact
                              portal
                              value={row.badge}
                              aria-label={`Badge row ${rowIndex + 1}`}
                              buttonRef={(node) =>
                                setCellRef(rowIndex, colIndex, node)
                              }
                              onFocus={common.onFocus}
                              onKeyDown={common.onKeyDown}
                              onChange={(badge: ProductBadge) =>
                                updateRow(rowIndex, (current) =>
                                  applyCellValue(
                                    current,
                                    'badge',
                                    badge,
                                    categories,
                                  ),
                                )
                              }
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={column.key} className={cellShellClassName}>
                          <input
                            ref={(node) => setCellRef(rowIndex, colIndex, node)}
                            type="text"
                            inputMode={
                              column.kind === 'number' ? 'decimal' : undefined
                            }
                            value={cellValue(row, column.key)}
                            placeholder={column.placeholder}
                            aria-label={`${column.label} row ${rowIndex + 1}`}
                            className={`${cellControlClassName} placeholder:text-mute/60`}
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

                    <div
                      className={`flex items-center justify-center ${cellShellClassName}`}
                    >
                      <button
                        type="button"
                        aria-label={`Remove row ${rowIndex + 1}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-mist hover:text-spark"
                        onClick={() => removeRow(rowIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div
                      className={`flex min-w-0 items-center px-2 text-[12px] ${cellShellClassName}`}
                    >
                      {row.status === 'ok' && row.createdId ? (
                        <Link
                          href={`/admin/catalog/products/${row.createdId}`}
                          className="truncate font-semibold text-navy hover:underline"
                        >
                          {row.message ?? 'Created · Edit'}
                        </Link>
                      ) : row.status === 'error' ? (
                        <span className="truncate text-spark">
                          {row.message}
                        </span>
                      ) : hasName ? (
                        <span className="text-mute">
                          Ready · {variantPreview} variant
                          {variantPreview === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="text-mute/50">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminActionButton
          type="button"
          disabled={pending}
          onClick={publishSheet}
        >
          {pending
            ? 'Creating…'
            : productCount > 0
              ? `Create ${productCount} product${productCount === 1 ? '' : 's'}`
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
