import type { BulkOrderRowInput } from '@/lib/orders/import-types'

export const ORDER_IMPORT_CSV_HEADERS = [
  'channel',
  'full_name',
  'phone',
  'secondary_phone',
  'email',
  'address',
  'city_name',
  'zone_name',
  'area_name',
  'city_id',
  'zone_id',
  'area_id',
  'payment_method',
  'shipping',
  'already_paid',
  'items',
  'notes',
] as const

export type BulkOrderLineInput = {
  sku?: string
  product?: string
  sizeEu?: number | null
  color?: string
  quantity: number
}

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'y'
}

/**
 * Parse manager-friendly item text into structured lines.
 *
 * Supported forms (semicolon or newline separated):
 * - `Product Name | 42 | Black | 1`
 * - `SKU-ABC x 2`
 * - `SKU-ABC, 2`
 */
export function parseOrderItemsText(
  raw: string,
): BulkOrderLineInput[] | { error: string } {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return { error: 'Add at least one item.' }

  const chunks = text
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (chunks.length === 0) return { error: 'Add at least one item.' }

  const lines: BulkOrderLineInput[] = []

  for (const chunk of chunks) {
    const pipeParts = chunk.split('|').map((p) => p.trim())
    if (pipeParts.length >= 3) {
      const product = pipeParts[0] ?? ''
      const sizeRaw = pipeParts[1] ?? ''
      const color = pipeParts[2] ?? ''
      const qtyRaw = pipeParts[3] ?? '1'
      const sizeEu = Number(sizeRaw)
      const quantity = Number(qtyRaw)
      if (!product) return { error: `Missing product in "${chunk}".` }
      if (!Number.isFinite(sizeEu) || sizeEu <= 0) {
        return { error: `Invalid size in "${chunk}". Use EU size like 42.` }
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return { error: `Invalid quantity in "${chunk}".` }
      }
      lines.push({
        product,
        sizeEu,
        color,
        quantity,
      })
      continue
    }

    const skuMatch = chunk.match(/^(.+?)\s*[x×,]\s*(\d+)\s*$/i)
    if (skuMatch) {
      const sku = skuMatch[1]!.trim()
      const quantity = Number(skuMatch[2])
      if (!sku || !Number.isInteger(quantity) || quantity < 1) {
        return { error: `Could not read item "${chunk}".` }
      }
      lines.push({ sku, quantity })
      continue
    }

    return {
      error: `Could not read item "${chunk}". Use "Name | size | color | qty" or "SKU x qty".`,
    }
  }

  return lines
}

export function orderImportCsvTemplate(): string {
  const example = [
    'whatsapp',
    'Rahim Khan',
    '01712345678',
    '',
    '',
    'House 12, Road 5, Block B',
    'Dhaka',
    'Dhanmondi',
    '',
    '',
    '',
    '',
    'cod',
    '80',
    'no',
    'Your Product Name | 42 | Black | 1',
    'From WhatsApp chat',
  ]
  return `${ORDER_IMPORT_CSV_HEADERS.join(',')}\n${example.map(csvEscape).join(',')}\n`
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Parse a simple CSV (quoted fields supported). */
export function parseOrderImportCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ''
  }
  const pushRow = () => {
    if (row.some((c) => c.trim())) rows.push(row)
    row = []
  }

  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!
    const next = input[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      pushCell()
      continue
    }
    if (ch === '\n') {
      pushCell()
      pushRow()
      continue
    }
    if (ch === '\r') continue
    cell += ch
  }
  pushCell()
  pushRow()
  return rows
}

export function csvRowsToBulkInputs(
  grid: string[][],
): BulkOrderRowInput[] | { error: string } {
  if (grid.length === 0) return { error: 'CSV is empty.' }

  const header = grid[0]!.map((h) => h.trim().toLowerCase())
  const indexOf = (name: string) => header.indexOf(name)

  const required = [
    'channel',
    'full_name',
    'phone',
    'address',
    'city_name',
    'zone_name',
    'items',
  ]
  for (const col of required) {
    if (indexOf(col) < 0) {
      return {
        error: `CSV is missing column "${col}". Download the template and keep the header row.`,
      }
    }
  }

  const out: BulkOrderRowInput[] = []
  for (let i = 1; i < grid.length; i += 1) {
    const cells = grid[i]!
    const get = (name: string) => {
      const idx = indexOf(name)
      return idx >= 0 ? (cells[idx] ?? '').trim() : ''
    }

    const shippingRaw = get('shipping')
    const cityIdRaw = get('city_id')
    const zoneIdRaw = get('zone_id')
    const areaIdRaw = get('area_id')

    out.push({
      key: crypto.randomUUID(),
      channel: get('channel'),
      fullName: get('full_name'),
      phone: get('phone'),
      secondaryPhone: get('secondary_phone'),
      email: get('email'),
      address: get('address'),
      cityName: get('city_name'),
      zoneName: get('zone_name'),
      areaName: get('area_name'),
      cityId: cityIdRaw ? Number(cityIdRaw) : null,
      zoneId: zoneIdRaw ? Number(zoneIdRaw) : null,
      areaId: areaIdRaw ? Number(areaIdRaw) : null,
      paymentMethod: get('payment_method') || 'cod',
      shipping: shippingRaw ? Number(shippingRaw) : null,
      alreadyPaid: parseBool(get('already_paid')),
      notes: get('notes'),
      items: get('items'),
    })
  }

  if (out.length === 0) return { error: 'No data rows found under the header.' }
  return out
}
