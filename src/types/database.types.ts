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
      customer_prices: {
        Row: {
          created_at: string | null;
          customer_id: string | null;
          id: string;
          price: number;
          product_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          price: number;
          product_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          price?: number;
          product_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
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
      customers: {
        Row: {
          address: string | null;
          ceo_name: string | null;
          code: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          phone: string | null;
          region_id: string | null;
          tax_type: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          ceo_name?: string | null;
          code: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          phone?: string | null;
          region_id?: string | null;
          tax_type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          ceo_name?: string | null;
          code?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          phone?: string | null;
          region_id?: string | null;
          tax_type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_transactions: {
        Row: {
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
          created_at?: string | null;
          date?: string;
          id?: string;
          item_type?: string;
          partner_name?: string | null;
          quantity?: number;
          remark?: string | null;
          transaction_type?: string;
        };
        Relationships: [];
      };
      monthly_settlements: {
        Row: {
          balance_amount: number;
          carry_over_amount: number;
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
          created_at: string | null;
          customer_id: string | null;
          id: string;
          payment_date: string;
          payment_method: string | null;
          remark: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          payment_date: string;
          payment_method?: string | null;
          remark?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          payment_date?: string;
          payment_method?: string | null;
          remark?: string | null;
        };
        Relationships: [
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
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          specification: string | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          specification?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          specification?: string | null;
        };
        Relationships: [];
      };
      regions: {
        Row: {
          code: string;
          created_at: string | null;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      sales_daily: {
        Row: {
          created_at: string | null;
          customer_id: string | null;
          id: string;
          is_paid: boolean | null;
          product_id: string | null;
          quantity: number;
          remark: string | null;
          supply_date: string;
          total_amount: number;
          unit_price: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          is_paid?: boolean | null;
          product_id?: string | null;
          quantity: number;
          remark?: string | null;
          supply_date: string;
          total_amount: number;
          unit_price: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          customer_id?: string | null;
          id?: string;
          is_paid?: boolean | null;
          product_id?: string | null;
          quantity?: number;
          remark?: string | null;
          supply_date?: string;
          total_amount?: number;
          unit_price?: number;
          updated_at?: string | null;
        };
        Relationships: [
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
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
