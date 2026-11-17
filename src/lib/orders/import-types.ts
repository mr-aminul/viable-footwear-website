export type BulkOrderRowInput = {
  key: string
  channel: string
  fullName: string
  phone: string
  secondaryPhone?: string
  email?: string
  address: string
  cityName: string
  zoneName: string
  areaName?: string
  cityId?: number | null
  zoneId?: number | null
  areaId?: number | null
  paymentMethod?: string
  /** Explicit shipping ৳; blank → quote Pathao or default ISD. */
  shipping?: number | null
  /** Already collected (offline bKash/Nagad/cash). */
  alreadyPaid?: boolean
  notes?: string
  /** Raw items cell, e.g. "Runner | 42 | Black | 1; SKU-ABC x 2" */
  items: string
  /**
   * When set (product picker), resolve by variant id instead of re-parsing
   * name/size/color — avoids slug/name collisions like Purechill vs PURECHILL.
   */
  variantLines?: Array<{ variantId: string; quantity: number }>
}

export type BulkOrderRowResult = {
  key: string
  ok: boolean
  id?: string
  orderNumber?: string
  error?: string
}
