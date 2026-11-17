import type { OrderImportPickerProduct } from '@/lib/catalog/queries'

export type OrderPickerSelectedLine = {
  key: string
  productId: string
  productName: string
  image: string
  variantId: string
  sizeEu: number
  color: string
  sku: string | null
  quantity: number
  unitPrice: number
}

/** Serialize picker lines into the import items text format. */
export function orderPickerLinesToItemsText(
  lines: OrderPickerSelectedLine[],
): string {
  return lines
    .filter((line) => line.quantity > 0)
    .map((line) => {
      if (line.sku?.trim()) {
        return `${line.sku.trim()} x ${line.quantity}`
      }
      return `${line.productName} | ${line.sizeEu} | ${line.color} | ${line.quantity}`
    })
    .join('; ')
}

export function summarizePickerLines(lines: OrderPickerSelectedLine[]): string {
  if (lines.length === 0) return ''
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0)
  if (lines.length === 1) {
    const line = lines[0]!
    return `${line.productName} · EU ${line.sizeEu} · ${line.color} ×${line.quantity}`
  }
  return `${lines.length} variants · ${totalQty} pcs`
}

export function findPickerProduct(
  catalog: OrderImportPickerProduct[],
  productId: string,
) {
  return catalog.find((product) => product.id === productId) ?? null
}
