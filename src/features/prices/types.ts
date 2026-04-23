import type { Tables } from "@/types/database.types";

export type CustomerRow = Tables<"customers">;
export type ProductRow = Tables<"products">;
export type CustomerPriceRow = Tables<"customer_prices">;
