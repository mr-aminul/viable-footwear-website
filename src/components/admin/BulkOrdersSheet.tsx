'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import Link from 'next/link'
import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'
import { OrderItemPickerModal } from '@/components/admin/OrderItemPicker'
import { bulkCreateOrders } from '@/lib/orders/actions'
import type { OrderImportPickerProduct } from '@/lib/catalog/queries'
import type { BulkOrderRowInput } from '@/lib/orders/import-types'
import {
  IMPORTABLE_ORDER_CHANNELS,
  isShopChannel,
  orderChannelLabel,
  parseOrderChannel,
} from '@/lib/orders/channels'
import {
  csvRowsToBulkInputs,
  orderImportCsvTemplate,
  parseOrderImportCsv,
} from '@/lib/orders/import-csv'
import {
  orderPickerLinesToItemsText,
  summarizePickerLines,
  type OrderPickerSelectedLine,
} from '@/lib/orders/picker-lines'
import {
  AdminButton,
  FormError,
  FormSuccess,
} from '@/components/admin/ui'
import { useUnsavedChanges } from '@/components/admin/unsaved-changes'
import { usePathaoLocations } from '@/hooks/usePathaoLocations'

type SheetColumn =
  | 'channel'
  | 'full_name'
  | 'phone'
  | 'secondary_phone'
  | 'email'
  | 'address'
  | 'city_name'
  | 'zone_name'
  | 'area_name'
  | 'payment_method'
  | 'shipping'
  | 'already_paid'
  | 'items'
  | 'notes'

type SheetRow = {
  key: string
  channel: string
  full_name: string
  phone: string
  secondary_phone: string
  email: string
  address: string
  city_id: string
  city_name: string
  zone_id: string
  zone_name: string
  area_id: string
  area_name: string
  payment_method: string
  shipping: string
  already_paid: boolean
  items: string
  picker_lines: OrderPickerSelectedLine[]
  notes: string
  status: 'idle' | 'ok' | 'error'
  message?: string
  createdId?: string
  createdOrderNumber?: string
}

const COLUMNS: Array<{
  key: SheetColumn
  label: string
  width: string
  kind: 'text' | 'number' | 'select' | 'checkbox' | 'location'
  placeholder?: string
}> = [
  { key: 'channel', label: 'Channel', width: 'minmax(0, 8.5rem)', kind: 'select' },
  {
    key: 'full_name',
    label: 'Name',
    width: 'minmax(0, 10rem)',
    kind: 'text',
    placeholder: 'Customer name',
  },
  {
    key: 'phone',
    label: 'Phone',
    width: 'minmax(0, 8rem)',
    kind: 'text',
    placeholder: '017…',
  },
  {
    key: 'secondary_phone',
    label: 'Alt phone',
    width: 'minmax(0, 7.5rem)',
    kind: 'text',
  },
  {
    key: 'email',
    label: 'Email',
    width: 'minmax(0, 10rem)',
    kind: 'text',
  },
  {
    key: 'address',
    label: 'Address',
    width: 'minmax(0, 12rem)',
    kind: 'text',
    placeholder: 'House / road',
  },
  {
    key: 'city_name',
    label: 'City',
    width: 'minmax(0, 9rem)',
    kind: 'location',
    placeholder: 'City',
  },
  {
    key: 'zone_name',
    label: 'Zone',
    width: 'minmax(0, 9rem)',
    kind: 'location',
    placeholder: 'Zone',
  },
  {
    key: 'area_name',
    label: 'Area',
    width: 'minmax(0, 9rem)',
    kind: 'location',
    placeholder: 'Area',
  },
  {
    key: 'payment_method',
    label: 'Pay',
    width: 'minmax(0, 6rem)',
    kind: 'select',
  },
  {
    key: 'shipping',
    label: 'Ship ৳',
    width: 'minmax(0, 5.5rem)',
    kind: 'number',
    placeholder: 'auto',
  },
  {
    key: 'already_paid',
    label: 'Paid?',
    width: 'minmax(0, 4.5rem)',
    kind: 'checkbox',
  },
  {
    key: 'items',
    label: 'Items',
    width: 'minmax(0, 14rem)',
    kind: 'text',
    placeholder: 'Pick products',
  },
  {
    key: 'notes',
    label: 'Notes',
    width: 'minmax(0, 9rem)',
    kind: 'text',
  },
]

const cellShellClassName = 'min-w-0 overflow-hidden border-l border-cloud/70'
const cellControlClassName =
  'h-full w-full min-w-0 bg-transparent px-2 py-1.5 text-[12px] text-ink outline-none focus:bg-navy/[0.04]'
const compactBtn =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition disabled:opacity-50'


const COLUMN_KEYS = COLUMNS.map((column) => column.key)
const INITIAL_BLANK_ROWS = 8
const PAYMENT_OPTIONS = ['cod', 'bkash', 'nagad'] as const

function createEmptyRow(): SheetRow {
  return {
    key: crypto.randomUUID(),
    channel: 'whatsapp',
    full_name: '',
    phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    city_id: '',
    city_name: '',
    zone_id: '',
    zone_name: '',
    area_id: '',
    area_name: '',
    payment_method: 'cod',
    shipping: '',
    already_paid: false,
    items: '',
    picker_lines: [],
    notes: '',
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
    row.full_name.trim() ||
      row.phone.trim() ||
      row.address.trim() ||
      row.city_name.trim() ||
      row.zone_name.trim() ||
      row.items.trim() ||
      row.picker_lines.length > 0 ||
      row.notes.trim() ||
      row.email.trim() ||
      row.secondary_phone.trim() ||
      row.area_name.trim() ||
      row.shipping.trim() ||
      row.already_paid,
  )
}

function cellValue(row: SheetRow, column: SheetColumn): string {
  if (column === 'already_paid') return row.already_paid ? 'yes' : ''
  return String(row[column] ?? '')
}

function applyCellValue(row: SheetRow, column: SheetColumn, raw: string): SheetRow {
  const value = raw.trim()

  switch (column) {
    case 'channel': {
      const parsed = parseOrderChannel(raw)
      return {
        ...row,
        channel: parsed ?? row.channel,
        status: 'idle',
        message: undefined,
      }
    }
    case 'payment_method': {
      const match = PAYMENT_OPTIONS.find(
        (method) => method === value.toLowerCase(),
      )
      return {
        ...row,
        payment_method: match ?? 'cod',
        status: 'idle',
        message: undefined,
      }
    }
    case 'already_paid':
      return {
        ...row,
        already_paid: parseBoolCell(raw),
        status: 'idle',
        message: undefined,
      }
    case 'full_name':
    case 'phone':
    case 'secondary_phone':
    case 'email':
    case 'address':
    case 'city_name':
    case 'zone_name':
    case 'area_name':
    case 'shipping':
    case 'items':
    case 'notes':
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

function toBulkInput(row: SheetRow): BulkOrderRowInput {
  const fromPicker = orderPickerLinesToItemsText(row.picker_lines)
  const variantLines = row.picker_lines
    .filter((line) => line.quantity > 0 && line.variantId)
    .map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
    }))
  return {
    key: row.key,
    channel: row.channel,
    fullName: row.full_name,
    phone: row.phone,
    secondaryPhone: row.secondary_phone,
    email: row.email,
    address: row.address,
    cityName: row.city_name,
    zoneName: row.zone_name,
    areaName: row.area_name,
    cityId: row.city_id ? Number(row.city_id) : null,
    zoneId: row.zone_id ? Number(row.zone_id) : null,
    areaId: row.area_id ? Number(row.area_id) : null,
    paymentMethod: row.payment_method,
    shipping: parseOptionalNumber(row.shipping),
    alreadyPaid: row.already_paid,
    notes: row.notes,
    items: fromPicker || row.items,
    variantLines: variantLines.length > 0 ? variantLines : undefined,
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

function downloadTemplate() {
  const blob = new Blob([orderImportCsvTemplate()], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'viable-orders-import-template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BulkOrdersSheet({
  catalog,
}: {
  catalog: OrderImportPickerProduct[]
}) {
  const [rows, setRows] = useState<SheetRow[]>(() =>
    createBlankRows(INITIAL_BLANK_ROWS),
  )
  const [focus, setFocus] = useState<{ row: number; col: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [pickerRowKey, setPickerRowKey] = useState<string | null>(null)
  const [pickerDraft, setPickerDraft] = useState<OrderPickerSelectedLine[]>([])
  const cellRefs = useRef(new Map<string, HTMLElement>())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    cities,
    citiesLoading,
    zonesByCity,
    areasByZone,
    loadingZones,
    loadingAreas,
    ensureZones,
    ensureAreas,
    findCityByName,
  } = usePathaoLocations()

  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        value: String(city.city_id),
        label: city.city_name,
      })),
    [cities],
  )

  const orderCount = useMemo(
    () =>
      rows.filter((row) => {
        const hasItems = row.picker_lines.length > 0 || Boolean(row.items.trim())
        if (!hasItems) return false
        if (isShopChannel(row.channel)) return Boolean(row.phone.trim())
        return Boolean(row.full_name.trim())
      }).length,
    [rows],
  )

  const openItemPicker = (row: SheetRow) => {
    setPickerRowKey(row.key)
    setPickerDraft(row.picker_lines)
  }

  const closeItemPicker = () => {
    setPickerRowKey(null)
    setPickerDraft([])
  }

  const saveItemPicker = () => {
    if (!pickerRowKey) return
    const itemsText = orderPickerLinesToItemsText(pickerDraft)
    setRows((current) =>
      current.map((row) =>
        row.key === pickerRowKey
          ? {
              ...row,
              picker_lines: pickerDraft,
              items: itemsText,
              status: 'idle',
              message: undefined,
            }
          : row,
      ),
    )
    closeItemPicker()
  }
  const isDirty = useMemo(() => rows.some((row) => isRowFilled(row)), [rows])

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
          row = applyCellValue(row, column, cells[c] ?? '')
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

  const applyCsvFile = async (file: File) => {
    setError(null)
    setSuccess(null)
    const text = await file.text()
    const grid = parseOrderImportCsv(text)
    const parsed = csvRowsToBulkInputs(grid)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }

    const mapped = parsed.map((row) => {
      const cityFromId =
        row.cityId != null
          ? cities.find((city) => city.city_id === Number(row.cityId))
          : null
      const cityFromName = cityFromId ?? findCityByName(row.cityName)
      const cityId = cityFromName ? String(cityFromName.city_id) : ''
      if (cityId) void ensureZones(cityId)

      return {
        key: row.key,
        channel: parseOrderChannel(row.channel) ?? 'whatsapp',
        full_name: row.fullName,
        phone: row.phone,
        secondary_phone: row.secondaryPhone ?? '',
        email: row.email ?? '',
        address: row.address,
        city_id: cityId,
        city_name: cityFromName?.city_name ?? row.cityName,
        zone_id: row.zoneId != null ? String(row.zoneId) : '',
        zone_name: row.zoneName,
        area_id: row.areaId != null ? String(row.areaId) : '',
        area_name: row.areaName ?? '',
        payment_method: row.paymentMethod || 'cod',
        shipping:
          row.shipping != null && Number.isFinite(row.shipping)
            ? String(row.shipping)
            : '',
        already_paid: Boolean(row.alreadyPaid),
        items: row.items,
        picker_lines: [],
        notes: row.notes ?? '',
        status: 'idle' as const,
      }
    })

    for (const row of mapped) {
      if (row.zone_id) void ensureAreas(row.zone_id)
    }

    setRows([...mapped, ...createBlankRows(2)])
    setSuccess(
      `Loaded ${parsed.length} row${parsed.length === 1 ? '' : 's'} from CSV. Review, then create.`,
    )
  }

  const onCsvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void applyCsvFile(file)
  }

  const performSave = async (): Promise<boolean> => {
    setError(null)
    setSuccess(null)

    const payload = rows
      .filter((row) => isRowFilled(row))
      .map(toBulkInput)

    if (payload.length === 0) {
      setError('Fill at least one row (name + items).')
      return false
    }

    const result = await bulkCreateOrders(payload)
    if (!result.ok) {
      setError(result.error)
      return false
    }

    const byKey = new Map(result.data!.results.map((item) => [item.key, item]))

    setRows((current) => {
      const next = current.map((row) => {
        if (!isRowFilled(row)) return row
        const outcome = byKey.get(row.key)
        if (!outcome) return row
        if (outcome.ok) {
          return {
            ...row,
            status: 'ok' as const,
            message: outcome.orderNumber ?? 'Created',
            createdId: outcome.id,
            createdOrderNumber: outcome.orderNumber,
          }
        }
        return {
          ...row,
          status: 'error' as const,
          message: outcome.error ?? 'Failed',
          createdId: undefined,
          createdOrderNumber: undefined,
        }
      })

      const remaining = next.filter((row) => row.status !== 'ok')
      const blankPad =
        remaining.filter((row) => isRowFilled(row)).length === 0
          ? createBlankRows(INITIAL_BLANK_ROWS)
          : createBlankRows(2)
      return [...remaining.filter((row) => isRowFilled(row)), ...blankPad]
    })

    const created = result.data!.created
    const failed = result.data!.results.filter((item) => !item.ok).length

    if (created > 0 && failed === 0) {
      setSuccess(
        `Created ${created} order${created === 1 ? '' : 's'}. Discord got one bulk alert.`,
      )
      return true
    }
    if (created > 0) {
      setSuccess(
        `Created ${created} order${created === 1 ? '' : 's'}. ${failed} row${failed === 1 ? '' : 's'} need fixes.`,
      )
      return false
    }
    setError('No orders were created. Fix the highlighted rows and try again.')
    return false
  }

  useUnsavedChanges(isDirty, performSave)

  const publishSheet = () => {
    startTransition(async () => {
      await performSave()
    })
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={downloadTemplate}
          className={`${compactBtn} border border-cloud bg-white text-ink hover:border-navy/30`}
        >
          <Download className="h-3.5 w-3.5" />
          CSV template
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          className={`${compactBtn} border border-cloud bg-white text-ink hover:border-navy/30`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onCsvChange}
        />
        <span className="ml-auto text-[12px] font-medium text-mute">
          Pick items with images ·{' '}
          <span className="font-semibold text-ink">
            {orderCount} ready
          </span>
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cloud bg-white">
        <div className="overflow-x-auto">
          <div className="w-max min-w-full">
            <div
              className="sticky top-0 z-10 grid items-center gap-0 border-b border-navy bg-navy text-[11px] font-semibold uppercase tracking-wider text-white"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="px-2 py-2 text-center">#</div>
              {COLUMNS.map((column) => (
                <div
                  key={column.key}
                  className="min-w-0 overflow-hidden border-l border-white/15 truncate px-2 py-2"
                >
                  {column.label}
                </div>
              ))}
              <div className="min-w-0 border-l border-white/15" />
              <div className="min-w-0 overflow-hidden border-l border-white/15 truncate px-2 py-2">
                Status
              </div>
            </div>

            <div>
              {rows.map((row, rowIndex) => {
                const shopSale = isShopChannel(row.channel)
                const ready = Boolean(
                  (shopSale
                    ? row.phone.trim()
                    : row.full_name.trim()) &&
                    (row.picker_lines.length > 0 || row.items.trim()),
                )

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
                    <div className="flex items-center justify-center px-2 text-[11px] text-mute">
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
                              checked={row.already_paid}
                              aria-label={`Already paid row ${rowIndex + 1}`}
                              className="h-4 w-4"
                              onChange={(event) =>
                                updateRow(rowIndex, (current) => ({
                                  ...current,
                                  already_paid: event.target.checked,
                                  status: 'idle',
                                  message: undefined,
                                }))
                              }
                              {...common}
                            />
                          </div>
                        )
                      }

                      if (column.key === 'channel') {
                        return (
                          <div key={column.key} className={cellShellClassName}>
                            <select
                              ref={(node) =>
                                setCellRef(rowIndex, colIndex, node)
                              }
                              value={row.channel}
                              aria-label={`Channel row ${rowIndex + 1}`}
                              className={cellControlClassName}
                              onChange={(event) =>
                                updateRow(rowIndex, (current) =>
                                  applyCellValue(
                                    current,
                                    'channel',
                                    event.target.value,
                                  ),
                                )
                              }
                              {...common}
                            >
                              {IMPORTABLE_ORDER_CHANNELS.map((channel) => (
                                <option key={channel} value={channel}>
                                  {orderChannelLabel(channel)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      }

                      if (column.key === 'city_name') {
                        if (shopSale) {
                          return (
                            <div
                              key={column.key}
                              className={`${cellShellClassName} px-2 text-[11px] text-mute`}
                            >
                              Shop pickup
                            </div>
                          )
                        }
                        return (
                          <div
                            key={column.key}
                            className={`${cellShellClassName} overflow-visible`}
                          >
                            <SearchableSelect
                              compact
                              portal
                              value={row.city_id}
                              disabled={citiesLoading}
                              placeholder={
                                citiesLoading ? 'Loading…' : 'Select city'
                              }
                              searchPlaceholder="Search city…"
                              options={cityOptions}
                              aria-label={`City row ${rowIndex + 1}`}
                              onChange={(next) => {
                                const city = cities.find(
                                  (item) => String(item.city_id) === next,
                                )
                                updateRow(rowIndex, (current) => ({
                                  ...current,
                                  city_id: next,
                                  city_name: city?.city_name ?? '',
                                  zone_id: '',
                                  zone_name: '',
                                  area_id: '',
                                  area_name: '',
                                  status: 'idle',
                                  message: undefined,
                                }))
                                if (next) void ensureZones(next)
                              }}
                            />
                          </div>
                        )
                      }

                      if (column.key === 'zone_name') {
                        if (shopSale) {
                          return (
                            <div
                              key={column.key}
                              className={`${cellShellClassName} px-2 text-[11px] text-mute`}
                            >
                              —
                            </div>
                          )
                        }
                        const zones = zonesByCity[row.city_id] ?? []
                        const zoneLoading = Boolean(loadingZones[row.city_id])
                        return (
                          <div
                            key={column.key}
                            className={`${cellShellClassName} overflow-visible`}
                          >
                            <SearchableSelect
                              compact
                              portal
                              value={row.zone_id}
                              disabled={!row.city_id || zoneLoading}
                              placeholder={
                                !row.city_id
                                  ? 'City first'
                                  : zoneLoading
                                    ? 'Loading…'
                                    : 'Select zone'
                              }
                              searchPlaceholder="Search zone…"
                              options={zones.map((zone) => ({
                                value: String(zone.zone_id),
                                label: zone.zone_name,
                              }))}
                              aria-label={`Zone row ${rowIndex + 1}`}
                              onChange={(next) => {
                                const zone = zones.find(
                                  (item) => String(item.zone_id) === next,
                                )
                                updateRow(rowIndex, (current) => ({
                                  ...current,
                                  zone_id: next,
                                  zone_name: zone?.zone_name ?? '',
                                  area_id: '',
                                  area_name: '',
                                  status: 'idle',
                                  message: undefined,
                                }))
                                if (next) void ensureAreas(next)
                              }}
                            />
                          </div>
                        )
                      }

                      if (column.key === 'area_name') {
                        if (shopSale) {
                          return (
                            <div
                              key={column.key}
                              className={`${cellShellClassName} px-2 text-[11px] text-mute`}
                            >
                              —
                            </div>
                          )
                        }
                        const areas = areasByZone[row.zone_id] ?? []
                        const areaLoading = Boolean(loadingAreas[row.zone_id])
                        return (
                          <div
                            key={column.key}
                            className={`${cellShellClassName} overflow-visible`}
                          >
                            <SearchableSelect
                              compact
                              portal
                              value={row.area_id}
                              disabled={!row.zone_id || areaLoading}
                              placeholder={
                                !row.zone_id
                                  ? 'Zone first'
                                  : areaLoading
                                    ? 'Loading…'
                                    : 'Area (optional)'
                              }
                              searchPlaceholder="Search area…"
                              options={areas.map((area) => ({
                                value: String(area.area_id),
                                label: area.area_name,
                              }))}
                              aria-label={`Area row ${rowIndex + 1}`}
                              onChange={(next) => {
                                const area = areas.find(
                                  (item) => String(item.area_id) === next,
                                )
                                updateRow(rowIndex, (current) => ({
                                  ...current,
                                  area_id: next,
                                  area_name: area?.area_name ?? '',
                                  status: 'idle',
                                  message: undefined,
                                }))
                              }}
                            />
                          </div>
                        )
                      }

                      if (column.key === 'items') {
                        const summary =
                          summarizePickerLines(row.picker_lines) ||
                          row.items.trim()
                        return (
                          <div
                            key={column.key}
                            className={`${cellShellClassName} px-1.5 py-1`}
                          >
                            <button
                              type="button"
                              className="flex h-full min-h-8 w-full items-center truncate rounded-md px-1.5 text-left text-[12px] hover:bg-navy/[0.04]"
                              onClick={() => openItemPicker(row)}
                              aria-label={`Items row ${rowIndex + 1}`}
                            >
                              <span
                                className={
                                  summary
                                    ? 'truncate font-medium text-ink'
                                    : 'truncate text-mute'
                                }
                              >
                                {summary || 'Pick products…'}
                              </span>
                            </button>
                          </div>
                        )
                      }

                      if (column.key === 'payment_method') {
                        return (
                          <div key={column.key} className={cellShellClassName}>
                            <select
                              ref={(node) =>
                                setCellRef(rowIndex, colIndex, node)
                              }
                              value={row.payment_method}
                              aria-label={`Payment row ${rowIndex + 1}`}
                              className={cellControlClassName}
                              onChange={(event) =>
                                updateRow(rowIndex, (current) =>
                                  applyCellValue(
                                    current,
                                    'payment_method',
                                    event.target.value,
                                  ),
                                )
                              }
                              {...common}
                            >
                              {PAYMENT_OPTIONS.map((method) => (
                                <option key={method} value={method}>
                                  {method.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      }

                      const shopSkip =
                        shopSale &&
                        (column.key === 'full_name' ||
                          column.key === 'secondary_phone' ||
                          column.key === 'email' ||
                          column.key === 'address' ||
                          column.key === 'shipping')

                      if (shopSkip) {
                        return (
                          <div
                            key={column.key}
                            className={`${cellShellClassName} px-2 text-[11px] text-mute`}
                          >
                            {column.key === 'address' ? 'Shop pickup' : '—'}
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
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-mute hover:bg-mist hover:text-spark"
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
                          href={`/admin/orders/${row.createdId}`}
                          className="truncate font-semibold text-navy hover:underline"
                        >
                          {row.message ?? 'Created'}
                        </Link>
                      ) : row.status === 'error' ? (
                        <span className="truncate text-spark">
                          {row.message}
                        </span>
                      ) : ready ? (
                        <span className="text-mute">Ready</span>
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
        <button
          type="button"
          disabled={pending}
          onClick={publishSheet}
          className={`${compactBtn} bg-navy text-white hover:bg-navy-deep`}
        >
          {pending
            ? 'Creating…'
            : orderCount > 0
              ? `Create ${orderCount}`
              : 'Create orders'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => addRows(1)}
          className={`${compactBtn} border border-cloud bg-white text-ink hover:border-navy/30`}
        >
          <Plus className="h-3.5 w-3.5" />
          Add row
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => addRows(10)}
          className={`${compactBtn} border border-cloud bg-white text-ink hover:border-navy/30`}
        >
          Add 10
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={clearEmptyRows}
          className="text-[12px] font-semibold text-navy hover:underline disabled:opacity-50"
        >
          Trim empty
        </button>
        <AdminButton href="/admin/orders" variant="ghost">
          Back to orders
        </AdminButton>
      </div>

      <OrderItemPickerModal
        open={Boolean(pickerRowKey)}
        catalog={catalog}
        value={pickerDraft}
        onChange={setPickerDraft}
        onClose={closeItemPicker}
        onDone={saveItemPicker}
      />
    </div>
  )
}
