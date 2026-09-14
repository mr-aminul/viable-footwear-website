import type { Database } from '@/lib/supabase/database.types'

export type OrderRow = Database['public']['Tables']['orders']['Row']
export type OrderItemRow = Database['public']['Tables']['order_items']['Row']

/** Columns loaded for the admin orders list (no line items). */
export type AdminOrderListRow = Pick<
  OrderRow,
  | 'id'
  | 'order_number'
  | 'status'
  | 'payment_method'
  | 'full_name'
  | 'phone'
  | 'city_name'
  | 'total'
  | 'pathao_consignment_id'
  | 'pathao_status'
  | 'pathao_error'
  | 'pathao_cancelled_at'
  | 'created_at'
>

export type OrderWithItems = OrderRow & {
  items: OrderItemRow[]
}

export type CheckoutLineInput = {
  productId: string
  variantId: string
  quantity: number
}
