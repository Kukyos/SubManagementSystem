// Generated from the Supabase schema. Regenerate after every migration; don't edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string
          from_status: string | null
          id: number
          message: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id: string
          from_status?: string | null
          id?: never
          message?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          from_status?: string | null
          id?: never
          message?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_runs: {
        Row: {
          as_of: string
          created_at: string
          duration_ms: number
          failed: Json
          id: string
          invoices_created: number
          ran_by: string | null
          subscriptions_billed: number
          subscriptions_closed: number
        }
        Insert: {
          as_of: string
          created_at?: string
          duration_ms?: number
          failed?: Json
          id?: string
          invoices_created?: number
          ran_by?: string | null
          subscriptions_billed?: number
          subscriptions_closed?: number
        }
        Update: {
          as_of?: string
          created_at?: string
          duration_ms?: number
          failed?: Json
          id?: string
          invoices_created?: number
          ran_by?: string | null
          subscriptions_billed?: number
          subscriptions_closed?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_runs_ran_by_fkey"
            columns: ["ran_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_number: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_products: {
        Row: {
          discount_id: string
          product_id: string
        }
        Insert: {
          discount_id: string
          product_id: string
        }
        Update: {
          discount_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_products_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          code: string | null
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          min_purchase: number
          min_quantity: number
          name: string
          scope: Database["public"]["Enums"]["discount_scope"]
          starts_on: string | null
          times_used: number
          type: Database["public"]["Enums"]["discount_type"]
          usage_limit: number | null
          value: number
        }
        Insert: {
          code?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          min_purchase?: number
          min_quantity?: number
          name: string
          scope?: Database["public"]["Enums"]["discount_scope"]
          starts_on?: string | null
          times_used?: number
          type: Database["public"]["Enums"]["discount_type"]
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          min_purchase?: number
          min_quantity?: number
          name?: string
          scope?: Database["public"]["Enums"]["discount_scope"]
          starts_on?: string | null
          times_used?: number
          type?: Database["public"]["Enums"]["discount_type"]
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          description: string
          discount_amount: number
          discount_id: string | null
          id: string
          invoice_id: string
          position: number
          product_id: string | null
          quantity: number
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number
          total: number | null
          unit_price: number
        }
        Insert: {
          description: string
          discount_amount?: number
          discount_id?: string | null
          id?: string
          invoice_id: string
          position?: number
          product_id?: string | null
          quantity?: number
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number
          total?: number | null
          unit_price?: number
        }
        Update: {
          description?: string
          discount_amount?: number
          discount_id?: string | null
          id?: string
          invoice_id?: string
          position?: number
          product_id?: string | null
          quantity?: number
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          discount_id: string | null
          discount_total: number
          due_date: string
          id: string
          invoice_date: string
          notes: string | null
          number: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          subtotal: number
          tax_total: number
          total: number
        }
        Insert: {
          amount_paid?: number
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          discount_id?: string | null
          discount_total?: number
          due_date?: string
          id?: string
          invoice_date?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          subtotal?: number
          tax_total?: number
          total?: number
        }
        Update: {
          amount_paid?: number
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          discount_id?: string | null
          discount_total?: number
          due_date?: string
          id?: string
          invoice_date?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          subtotal?: number
          tax_total?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          auto_close: boolean
          available_from: string | null
          available_until: string | null
          billing_interval: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          closable: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          min_quantity: number
          name: string
          pausable: boolean
          price: number
          product_id: string | null
          renewable: boolean
        }
        Insert: {
          auto_close?: boolean
          available_from?: string | null
          available_until?: string | null
          billing_interval?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          closable?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_quantity?: number
          name: string
          pausable?: boolean
          price?: number
          product_id?: string | null
          renewable?: boolean
        }
        Update: {
          auto_close?: boolean
          available_from?: string | null
          available_until?: string | null
          billing_interval?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          closable?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_quantity?: number
          name?: string
          pausable?: boolean
          price?: number
          product_id?: string | null
          renewable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attribute: string
          extra_price: number
          id: string
          product_id: string
          value: string
        }
        Insert: {
          attribute: string
          extra_price?: number
          id?: string
          product_id: string
          value: string
        }
        Update: {
          attribute?: string
          extra_price?: number
          id?: string
          product_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sales_price: number
          tax_id: string | null
          type: Database["public"]["Enums"]["product_type"]
        }
        Insert: {
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sales_price?: number
          tax_id?: string | null
          type?: Database["public"]["Enums"]["product_type"]
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sales_price?: number
          tax_id?: string | null
          type?: Database["public"]["Enums"]["product_type"]
        }
        Relationships: [
          {
            foreignKeyName: "products_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      quotation_template_lines: {
        Row: {
          description: string | null
          id: string
          position: number
          product_id: string
          quantity: number
          template_id: string
          unit_price: number | null
          variant_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          position?: number
          product_id: string
          quantity?: number
          template_id: string
          unit_price?: number | null
          variant_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          position?: number
          product_id?: string
          quantity?: number
          template_id?: string
          unit_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_template_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quotation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_template_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_templates: {
        Row: {
          created_at: string
          duration_periods: number | null
          id: string
          name: string
          notes: string | null
          payment_terms: Database["public"]["Enums"]["payment_terms"]
          plan_id: string
          validity_days: number
        }
        Insert: {
          created_at?: string
          duration_periods?: number | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"]
          plan_id: string
          validity_days?: number
        }
        Update: {
          created_at?: string
          duration_periods?: number | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"]
          plan_id?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_templates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_discounts: {
        Row: {
          created_at: string
          discount_id: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          discount_id: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          discount_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_discounts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_discounts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_lines: {
        Row: {
          amount: number | null
          description: string | null
          id: string
          position: number
          product_id: string
          quantity: number
          subscription_id: string
          tax_id: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          amount?: number | null
          description?: string | null
          id?: string
          position?: number
          product_id: string
          quantity?: number
          subscription_id: string
          tax_id?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          amount?: number | null
          description?: string | null
          id?: string
          position?: number
          product_id?: string
          quantity?: number
          subscription_id?: string
          tax_id?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_lines_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_lines_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          created_at: string
          customer_id: string
          expiry_date: string | null
          id: string
          next_invoice_date: string | null
          notes: string | null
          number: string
          paused_at: string | null
          payment_terms: Database["public"]["Enums"]["payment_terms"]
          plan_id: string
          quote_valid_until: string | null
          salesperson_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id: string
          expiry_date?: string | null
          id?: string
          next_invoice_date?: string | null
          notes?: string | null
          number?: string
          paused_at?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"]
          plan_id: string
          quote_valid_until?: string | null
          salesperson_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          expiry_date?: string | null
          id?: string
          next_invoice_date?: string | null
          notes?: string | null
          number?: string
          paused_at?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"]
          plan_id?: string
          quote_valid_until?: string | null
          salesperson_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quotation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      taxes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          rate: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bill_now: { Args: { p_subscription_id: string }; Returns: number }
      bill_subscription: {
        Args: { p_as_of?: string; p_subscription_id: string }
        Returns: number
      }
      finance_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      monthly_factor: {
        Args: { n: number; p: Database["public"]["Enums"]["billing_period"] }
        Returns: number
      }
      my_customer_id: { Args: never; Returns: string }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      period_interval: {
        Args: { n: number; p: Database["public"]["Enums"]["billing_period"] }
        Returns: string
      }
      portal_subscribe: {
        Args: { p_plan_id: string; p_quantity?: number; p_variant_id?: string }
        Returns: string
      }
      portal_subscription_action: {
        Args: { p_action: string; p_subscription_id: string }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      product_costs: {
        Args: never
        Returns: {
          cost_price: number
          product_id: string
        }[]
      }
      run_billing: { Args: { p_as_of?: string }; Returns: Json }
      terms_days: {
        Args: { t: Database["public"]["Enums"]["payment_terms"] }
        Returns: number
      }
    }
    Enums: {
      billing_period: "daily" | "weekly" | "monthly" | "yearly"
      discount_scope: "products" | "subscription"
      discount_type: "percent" | "fixed"
      invoice_status: "draft" | "confirmed" | "paid" | "cancelled"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "card"
        | "upi"
        | "cheque"
        | "online"
      payment_terms:
        | "immediate"
        | "net_7"
        | "net_15"
        | "net_30"
        | "net_45"
        | "net_60"
      product_type: "service" | "goods" | "addon"
      subscription_status:
        | "draft"
        | "quotation"
        | "confirmed"
        | "active"
        | "paused"
        | "closed"
      user_role: "admin" | "staff" | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      billing_period: ["daily", "weekly", "monthly", "yearly"],
      discount_scope: ["products", "subscription"],
      discount_type: ["percent", "fixed"],
      invoice_status: ["draft", "confirmed", "paid", "cancelled"],
      payment_method: ["cash", "bank_transfer", "card", "upi", "cheque", "online"],
      payment_terms: ["immediate", "net_7", "net_15", "net_30", "net_45", "net_60"],
      product_type: ["service", "goods", "addon"],
      subscription_status: ["draft", "quotation", "confirmed", "active", "paused", "closed"],
      user_role: ["admin", "staff", "customer"],
    },
  },
} as const
