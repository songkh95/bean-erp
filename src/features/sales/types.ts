import type { Tables, TablesInsert } from "@/types/database.types";

export type CustomerRow = Tables<"customers">;
export type ProductRow = Tables<"products">;
export type CustomerPriceRow = Tables<"customer_prices">;
export type SalesDailyRow = Tables<"sales_daily">;
export type SalesDailyInsert = TablesInsert<"sales_daily">;
