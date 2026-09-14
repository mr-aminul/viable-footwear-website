export type UserRole = 'admin' | 'manager'
export type OrderStatus =
  | 'new'
  | 'pending_payment'
  | 'paid'
  | 'awaiting_fulfillment'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
export type PaymentMethod = 'cod' | 'bkash' | 'nagad'

/** Snapshot of a Pathao consignment archived when Resend reopens the order. */
export type PathaoHistoryEntry = {
  consignment_id: string
  status: string | null
  error: string | null
  cancelled_at: string | null
  archived_at: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          image_path: string | null
          sort_order: number
          active: boolean
          seo_title: string | null
          seo_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          image_path?: string | null
          sort_order?: number
          active?: boolean
          seo_title?: string | null
          seo_description?: string | null
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          name: string
          slug: string
          description: string
          price: number
          compare_at: number | null
          weight_kg: number
          rating: number
          reviews_count: number
          badge: string | null
          featured: boolean
          active: boolean
          related_product_ids: string[]
          seo_title: string | null
          seo_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          slug: string
          description?: string
          price: number
          compare_at?: number | null
          weight_kg?: number
          rating?: number
          reviews_count?: number
          badge?: string | null
          featured?: boolean
          active?: boolean
          related_product_ids?: string[]
          seo_title?: string | null
          seo_description?: string | null
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
      product_media: {
        Row: {
          id: string
          product_id: string
          media_type: 'image' | 'video'
          storage_path: string
          alt: string | null
          sort_order: number
          color_hex: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          media_type: 'image' | 'video'
          storage_path: string
          alt?: string | null
          sort_order?: number
          color_hex?: string | null
        }
        Update: Partial<Database['public']['Tables']['product_media']['Insert']>
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          size_eu: number
          color: string | null
          color_hex: string | null
          sku: string | null
          stock: number
          price_override: number | null
          media_id: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          size_eu: number
          color?: string | null
          color_hex?: string | null
          sku?: string | null
          stock?: number
          price_override?: number | null
          media_id?: string | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          name: string
          priority: number
          active: boolean
          starts_at: string | null
          ends_at: string | null
          rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          priority?: number
          active?: boolean
          starts_at?: string | null
          ends_at?: string | null
          rules?: Json
        }
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
        Relationships: []
      }
      integration_settings: {
        Row: {
          key: string
          value: Json
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['integration_settings']['Insert']>
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          status: OrderStatus
          payment_method: PaymentMethod
          email: string | null
          full_name: string
          phone: string
          secondary_phone: string | null
          address: string
          city_id: number
          zone_id: number
          area_id: number | null
          city_name: string
          zone_name: string
          area_name: string
          subtotal: number
          shipping: number
          total: number
          pathao_delivery_fee: number | null
          pathao_consignment_id: string | null
          pathao_status: string | null
          pathao_error: string | null
          pathao_cancelled_at: string | null
          pathao_history: PathaoHistoryEntry[]
          campaign_id: string | null
          notes: string | null
          paid_at: string | null
          payment_trx_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          status?: OrderStatus
          payment_method?: PaymentMethod
          email?: string | null
          full_name: string
          phone: string
          secondary_phone?: string | null
          address: string
          city_id: number
          zone_id: number
          area_id?: number | null
          city_name: string
          zone_name: string
          area_name?: string
          subtotal: number
          shipping: number
          total: number
          pathao_delivery_fee?: number | null
          pathao_consignment_id?: string | null
          pathao_status?: string | null
          pathao_error?: string | null
          pathao_cancelled_at?: string | null
          pathao_history?: PathaoHistoryEntry[]
          campaign_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_trx_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          size_eu: number | null
          color: string | null
          sku: string | null
          unit_price: number
          quantity: number
          weight_kg: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          variant_id?: string | null
          product_name: string
          size_eu?: number | null
          color?: string | null
          sku?: string | null
          unit_price: number
          quantity: number
          weight_kg?: number
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
        Relationships: []
      }
      payment_attempts: {
        Row: {
          id: string
          order_id: string
          gateway: 'bkash' | 'nagad'
          external_id: string | null
          trx_id: string | null
          status: 'created' | 'completed' | 'failed' | 'cancelled'
          amount: number
          raw_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          gateway: 'bkash' | 'nagad'
          external_id?: string | null
          trx_id?: string | null
          status?: 'created' | 'completed' | 'failed' | 'cancelled'
          amount: number
          raw_json?: Json
        }
        Update: Partial<Database['public']['Tables']['payment_attempts']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      media_type: 'image' | 'video'
      order_status: OrderStatus
      payment_method: PaymentMethod
    }
    CompositeTypes: Record<string, never>
  }
}
