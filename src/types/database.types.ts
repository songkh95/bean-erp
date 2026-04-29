export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null;
          bank_accounts: Json;
          business_number: string | null;
          ceo_name: string | null;
          created_at: string;
          id: string;
          name: string;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          bank_accounts?: Json;
          business_number?: string | null;
          ceo_name?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          bank_accounts?: Json;
          business_number?: string | null;
          ceo_name?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      company_users: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_prices: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          customer_id: string | null;
          id: string;
          is_active: boolean;
          price: number;
          product_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean;
          price: number;
          product_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean;
          price?: number;
          product_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_prices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_prices_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_prices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_price_history: {
        Row: {
          company_id: string;
          created_at: string;
          customer_id: string;
          effective_from: string;
          id: string;
          is_active: boolean;
          price: number;
          product_id: string;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          customer_id: string;
          effective_from?: string;
          id?: string;
          is_active?: boolean;
          price: number;
          product_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          customer_id?: string;
          effective_from?: string;
          id?: string;
          is_active?: boolean;
          price?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_price_history_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_price_history_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          address: string | null;
          business_number: string | null;
          ceo_name: string | null;
          code: string;
          company_id: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          note: string | null;
          phone: string | null;
          region_id: string | null;
          tax_type: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          business_number?: string | null;
          ceo_name?: string | null;
          code: string;
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          note?: string | null;
          phone?: string | null;
          region_id?: string | null;
          tax_type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          business_number?: string | null;
          ceo_name?: string | null;
          code?: string;
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          note?: string | null;
          phone?: string | null;
          region_id?: string | null;
          tax_type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_drivers: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          region_groups: string[];
          vehicle_number: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          region_groups?: string[];
          vehicle_number: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          region_groups?: string[];
          vehicle_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      deposits: {
        Row: {
          amount: number;
          company_id: string;
          created_at: string;
          customer_id: string;
          deposit_date: string;
          id: string;
          note: string | null;
          payment_method: string;
        };
        Insert: {
          amount: number;
          company_id?: string;
          created_at?: string;
          customer_id: string;
          deposit_date: string;
          id?: string;
          note?: string | null;
          payment_method?: string;
        };
        Update: {
          amount?: number;
          company_id?: string;
          created_at?: string;
          customer_id?: string;
          deposit_date?: string;
          id?: string;
          note?: string | null;
          payment_method?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deposits_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deposits_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_transactions: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          date: string;
          id: string;
          item_type: string;
          partner_name: string | null;
          quantity: number;
          remark: string | null;
          transaction_type: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          date: string;
          id?: string;
          item_type: string;
          partner_name?: string | null;
          quantity: number;
          remark?: string | null;
          transaction_type: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          date?: string;
          id?: string;
          item_type?: string;
          partner_name?: string | null;
          quantity?: number;
          remark?: string | null;
          transaction_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_settlements: {
        Row: {
          balance_amount: number;
          carry_over_amount: number;
          company_id: string | null;
          created_at: string | null;
          customer_id: string | null;
          id: string;
          is_closed: boolean | null;
          month: string;
          total_payments: number;
          total_sales: number;
        };
        Insert: {
          balance_amount?: number;
          carry_over_amount?: number;
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          is_closed?: boolean | null;
          month: string;
          total_payments?: number;
          total_sales?: number;
        };
        Update: {
          balance_amount?: number;
          carry_over_amount?: number;
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          is_closed?: boolean | null;
          month?: string;
          total_payments?: number;
          total_sales?: number;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_settlements_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_settlements_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          company_id: string | null;
          created_at: string | null;
          customer_id: string | null;
          id: string;
          payment_date: string;
          payment_method: string | null;
          remark: string | null;
        };
        Insert: {
          amount: number;
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          payment_date: string;
          payment_method?: string | null;
          remark?: string | null;
        };
        Update: {
          amount?: number;
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          payment_date?: string;
          payment_method?: string | null;
          remark?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          code: string;
          company_id: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          specification: string | null;
        };
        Insert: {
          code: string;
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          specification?: string | null;
        };
        Update: {
          code?: string;
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          specification?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      regions: {
        Row: {
          code: string;
          company_id: string | null;
          created_at: string | null;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_daily: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          customer_id: string | null;
          delivery_status: string;
          id: string;
          is_paid: boolean | null;
          product_id: string | null;
          quantity: number;
          recorded_unit: string | null;
          recorded_unit_price: number | null;
          remark: string | null;
          supply_date: string;
          total_amount: number;
          unit_price: number;
          updated_at: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          delivery_status?: string;
          id?: string;
          is_paid?: boolean | null;
          product_id?: string | null;
          quantity: number;
          recorded_unit?: string | null;
          recorded_unit_price?: number | null;
          remark?: string | null;
          supply_date: string;
          total_amount: number;
          unit_price: number;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          delivery_status?: string;
          id?: string;
          is_paid?: boolean | null;
          product_id?: string | null;
          quantity?: number;
          recorded_unit?: string | null;
          recorded_unit_price?: number | null;
          remark?: string | null;
          supply_date?: string;
          total_amount?: number;
          unit_price?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_daily_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_daily_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_daily_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      customer_balances: {
        Row: {
          company_id: string | null;
          customer_code: string | null;
          customer_id: string | null;
          customer_name: string | null;
          outstanding_amount: number | null;
          total_deposits: number | null;
          total_sales: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      can_access_company: {
        Args: {
          target_company_id: string;
        };
        Returns: boolean;
      };
      current_company_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
