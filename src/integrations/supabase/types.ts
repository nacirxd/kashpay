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
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          ativo: boolean
          config: Json | null
          created_at: string
          id: string
          tipo: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          tipo: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          categoria: string | null
          created_at: string
          currency: string
          delivery_type: string
          descricao: string | null
          downsell_url: string | null
          external_url: string | null
          file_url: string | null
          id: string
          image_url: string | null
          meta_access_token: string | null
          meta_pixel_id: string | null
          nome: string
          order_bump_description: string | null
          order_bump_price: number | null
          order_bump_product_id: string | null
          order_bump_title: string | null
          payment_methods: string[]
          preco: number
          status: string
          support_email: string | null
          support_phone: string | null
          tipo: string
          upsell_url: string | null
          upsell_urls: Json
          user_id: string
          webhook_url: string | null
          zenofy_product_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          currency?: string
          delivery_type?: string
          descricao?: string | null
          downsell_url?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          nome: string
          order_bump_description?: string | null
          order_bump_price?: number | null
          order_bump_product_id?: string | null
          order_bump_title?: string | null
          payment_methods?: string[]
          preco?: number
          status?: string
          support_email?: string | null
          support_phone?: string | null
          tipo?: string
          upsell_url?: string | null
          upsell_urls?: Json
          user_id: string
          webhook_url?: string | null
          zenofy_product_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          currency?: string
          delivery_type?: string
          descricao?: string | null
          downsell_url?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          nome?: string
          order_bump_description?: string | null
          order_bump_price?: number | null
          order_bump_product_id?: string | null
          order_bump_title?: string | null
          payment_methods?: string[]
          preco?: number
          status?: string
          support_email?: string | null
          support_phone?: string | null
          tipo?: string
          upsell_url?: string | null
          upsell_urls?: Json
          user_id?: string
          webhook_url?: string | null
          zenofy_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_order_bump_product_id_fkey"
            columns: ["order_bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banco_conta: string | null
          banco_nome: string | null
          created_at: string
          currency: string
          email: string
          emola_nome: string | null
          emola_telefone: string | null
          id: string
          mpesa_nome: string | null
          mpesa_telefone: string | null
          nome: string
          status: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banco_conta?: string | null
          banco_nome?: string | null
          created_at?: string
          currency?: string
          email?: string
          emola_nome?: string | null
          emola_telefone?: string | null
          id?: string
          mpesa_nome?: string | null
          mpesa_telefone?: string | null
          nome?: string
          status?: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banco_conta?: string | null
          banco_nome?: string | null
          created_at?: string
          currency?: string
          email?: string
          emola_nome?: string | null
          emola_telefone?: string | null
          id?: string
          mpesa_nome?: string | null
          mpesa_telefone?: string | null
          nome?: string
          status?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          bump_product_id: string | null
          bump_valor: number | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_whatsapp: string | null
          created_at: string
          external_transaction_id: string | null
          gateway: string | null
          id: string
          mcx_entity: string | null
          mcx_reference: string | null
          payment_method: string | null
          payment_phone: string | null
          product_id: string
          status: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          valor: number
          zenofy_checkout_id: string | null
        }
        Insert: {
          bump_product_id?: string | null
          bump_valor?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_whatsapp?: string | null
          created_at?: string
          external_transaction_id?: string | null
          gateway?: string | null
          id?: string
          mcx_entity?: string | null
          mcx_reference?: string | null
          payment_method?: string | null
          payment_phone?: string | null
          product_id: string
          status?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor: number
          zenofy_checkout_id?: string | null
        }
        Update: {
          bump_product_id?: string | null
          bump_valor?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_whatsapp?: string | null
          created_at?: string
          external_transaction_id?: string | null
          gateway?: string | null
          id?: string
          mcx_entity?: string | null
          mcx_reference?: string | null
          payment_method?: string | null
          payment_phone?: string | null
          product_id?: string
          status?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number
          zenofy_checkout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string
          provider: string
          provider_response: string | null
          recipient_phone: string
          sale_id: string | null
          sender_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          provider?: string
          provider_response?: string | null
          recipient_phone: string
          sale_id?: string | null
          sender_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          provider?: string
          provider_response?: string | null
          recipient_phone?: string
          sale_id?: string | null
          sender_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          conta: string
          created_at: string
          id: string
          metodo: string
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          conta: string
          created_at?: string
          id?: string
          metodo?: string
          status?: string
          user_id: string
          valor: number
        }
        Update: {
          conta?: string
          created_at?: string
          id?: string
          metodo?: string
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
