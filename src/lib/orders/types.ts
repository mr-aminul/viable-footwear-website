import type { Database } from '@/lib/supabase/database.types'

export type OrderRow = Database['public']['Tables']['orders']['Row']
export type OrderItemRow = Database['public']['Tables']['order_items']['Row']

export type OrderWithItems = OrderRow & {
  items: OrderItemRow[]
}

export type CheckoutLineInput = {
  productId: string
  variantId: string
  quantity: number
}
