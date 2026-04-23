"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type ProductRow = Tables<"products">;
type CustomerRow = Tables<"customers">;
type ActiveCustomerPriceRow = Pick<Tables<"customer_prices">, "id" | "customer_id" | "product_id" | "is_active">;

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, specification, is_active")
    .order("code", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as ProductRow[];
}

async function fetchCustomers() {
  const { data, error } = await supabase.from("customers").select("id, name").order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchActiveCustomerPrices() {
  const { data, error } = await supabase
    .from("customer_prices")
    .select("id, customer_id, product_id, is_active")
    .eq("is_active", true);
  if (error) {
    throw error;
  }
  return (data ?? []) as ActiveCustomerPriceRow[];
}

export function ProductCustomerManagement() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "major-customers"],
    queryFn: fetchProducts,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "major-customers"],
    queryFn: fetchCustomers,
  });
  const { data: customerPrices = [] } = useQuery({
    queryKey: ["customer-prices", "major-customers", "active"],
    queryFn: fetchActiveCustomerPrices,
  });

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customers]);

  const majorCustomerNamesByProductId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of customerPrices) {
      if (!row.product_id || !row.customer_id || !row.is_active) {
        continue;
      }
      const customerName = customerNameById.get(row.customer_id);
      if (!customerName) {
        continue;
      }
      const current = map.get(row.product_id) ?? [];
      current.push(customerName);
      map.set(row.product_id, current);
    }
    return map;
  }, [customerNameById, customerPrices]);

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div>
        <h2 className="text-xl font-bold">품목별 주요거래처</h2>
        <p className="text-sm text-slate-600">취급(is_active=true) 거래처를 품목별로 확인합니다.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>품목코드</TableHead>
            <TableHead>품목명</TableHead>
            <TableHead>규격</TableHead>
            <TableHead>주요 거래처</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                데이터를 불러오는 중입니다...
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            products.map((product) => {
              const names = majorCustomerNamesByProductId.get(product.id) ?? [];
              return (
                <TableRow key={product.id}>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.specification ?? "-"}</TableCell>
                  <TableCell>{names.length > 0 ? names.join(", ") : "-"}</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </section>
  );
}
