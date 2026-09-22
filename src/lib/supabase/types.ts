export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean
          line1: string
          line2: string | null
          name: string
          phone: string
          pincode: string
          profile_id: string
          state: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          line1: string
          line2?: string | null
          name: string
          phone: string
          pincode: string
          profile_id: string
          state: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          line1?: string
          line2?: string | null
          name?: string
          phone?: string
          pincode?: string
          profile_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active_from: string | null
          active_until: string | null
          created_at: string
          cta_text: string | null
          cta_url: string | null
          headline: string | null
          id: string
          image_url: string | null
          position: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          position: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          position?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          quantity: number
          scent_id: string
        }
        Insert: {
          bundle_id: string
          quantity?: number
          scent_id: string
        }
        Update: {
          bundle_id?: string
          quantity?: number
          scent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_scent_id_fkey"
            columns: ["scent_id"]
            isOneToOne: false
            referencedRelation: "scents"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_urls: string[]
          name: string
          price: number
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          name: string
          price: number
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          name?: string
          price?: number
          slug?: string
          status?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          bundle_id: string | null
          cart_id: string
          created_at: string
          id: string
          quantity: number
          scent_id: string | null
        }
        Insert: {
          bundle_id?: string | null
          cart_id: string
          created_at?: string
          id?: string
          quantity?: number
          scent_id?: string | null
        }
        Update: {
          bundle_id?: string | null
          cart_id?: string
          created_at?: string
          id?: string
          quantity?: number
          scent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_scent_id_fkey"
            columns: ["scent_id"]
            isOneToOne: false
            referencedRelation: "scents"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          anon_token: string | null
          created_at: string
          id: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          anon_token?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          anon_token?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read_at?: string | null
        }
        Relationships: []
      }
      discounts: {
        Row: {
          active_from: string | null
          active_until: string | null
          code: string
          created_at: string
          max_uses: number | null
          min_subtotal: number
          type: string
          used_count: number
          value: number
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          code: string
          created_at?: string
          max_uses?: number | null
          min_subtotal?: number
          type: string
          used_count?: number
          value: number
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          code?: string
          created_at?: string
          max_uses?: number | null
          min_subtotal?: number
          type?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          rule_json: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          rule_json: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          rule_json?: Json
        }
        Relationships: []
      }
      order_items: {
        Row: {
          bundle_id: string | null
          id: string
          name_snapshot: string
          order_id: string
          price_snapshot: number
          quantity: number
          scent_id: string | null
        }
        Insert: {
          bundle_id?: string | null
          id?: string
          name_snapshot: string
          order_id: string
          price_snapshot: number
          quantity: number
          scent_id?: string | null
        }
        Update: {
          bundle_id?: string | null
          id?: string
          name_snapshot?: string
          order_id?: string
          price_snapshot?: number
          quantity?: number
          scent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_scent_id_fkey"
            columns: ["scent_id"]
            isOneToOne: false
            referencedRelation: "scents"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_snapshot: Json
          cod_surcharge: number
          code: string
          created_at: string
          discount_code: string | null
          discount_total: number
          id: string
          payment_method: string
          payment_status: string
          profile_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          shipping_total: number
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          address_snapshot: Json
          cod_surcharge?: number
          code: string
          created_at?: string
          discount_code?: string | null
          discount_total?: number
          id?: string
          payment_method: string
          payment_status?: string
          profile_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping_total?: number
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          address_snapshot?: Json
          cod_surcharge?: number
          code?: string
          created_at?: string
          discount_code?: string | null
          discount_total?: number
          id?: string
          payment_method?: string
          payment_status?: string
          profile_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping_total?: number
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          base_price: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          order_id: string
          processed_at: string | null
          reason: string
          refund_amount: number | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          processed_at?: string | null
          reason: string
          refund_amount?: number | null
          status?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          reason?: string
          refund_amount?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          order_id: string
          photo_urls: string[]
          profile_id: string
          rating: number
          scent_id: string
          status: string
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          order_id: string
          photo_urls?: string[]
          profile_id: string
          rating: number
          scent_id: string
          status?: string
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          order_id?: string
          photo_urls?: string[]
          profile_id?: string
          rating?: number
          scent_id?: string
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_scent_id_fkey"
            columns: ["scent_id"]
            isOneToOne: false
            referencedRelation: "scents"
            referencedColumns: ["id"]
          },
        ]
      }
      scents: {
        Row: {
          active: boolean
          base_notes: string | null
          created_at: string
          description: string | null
          heart_notes: string | null
          id: string
          image_urls: string[]
          name: string
          product_id: string
          slug: string
          sort_order: number
          stock_qty: number
          tagline: string | null
          top_notes: string | null
        }
        Insert: {
          active?: boolean
          base_notes?: string | null
          created_at?: string
          description?: string | null
          heart_notes?: string | null
          id?: string
          image_urls?: string[]
          name: string
          product_id: string
          slug: string
          sort_order?: number
          stock_qty?: number
          tagline?: string | null
          top_notes?: string | null
        }
        Update: {
          active?: boolean
          base_notes?: string | null
          created_at?: string
          description?: string | null
          heart_notes?: string | null
          id?: string
          image_urls?: string[]
          name?: string
          product_id?: string
          slug?: string
          sort_order?: number
          stock_qty?: number
          tagline?: string | null
          top_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          awb_number: string
          courier_name: string
          created_at: string
          delivered_at: string | null
          dispatched_at: string | null
          order_id: string
        }
        Insert: {
          awb_number: string
          courier_name: string
          created_at?: string
          delivered_at?: string | null
          dispatched_at?: string | null
          order_id: string
        }
        Update: {
          awb_number?: string
          courier_name?: string
          created_at?: string
          delivered_at?: string | null
          dispatched_at?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      razorpay_webhook_events: {
        Row: {
          id: string
          processed_at: string
        }
        Insert: {
          id: string
          processed_at?: string
        }
        Update: {
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: { Args: Record<PropertyKey, never>; Returns: string }
      next_order_code: { Args: Record<PropertyKey, never>; Returns: string }
      upsert_cart_item: {
        Args: { p_cart_id: string; p_scent_id: string | null; p_bundle_id: string | null; p_quantity: number }
        Returns: undefined
      }
      finalize_paid_order: {
        Args: { p_rzp_order_id: string; p_rzp_payment_id: string }
        Returns: Json
      }
      get_auth_uid_by_email: {
        Args: { p_email: string }
        Returns: string | null
      }
      set_default_address: {
        Args: { p_profile_id: string; p_id: string }
        Returns: undefined
      }
      admin_upsert_product: {
        Args: { p_id: string | null; p_payload: Json }
        Returns: string
      }
      commit_order_stock: {
        Args: { p_order_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
