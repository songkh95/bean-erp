"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/types/database.types";

import { CustomerListPanel } from "./customer-list-panel";
import { PriceTablePanel } from "./price-table-panel";
import type { CustomerRow, ProductRow } from "./types";

type CustomerPriceInsert = TablesInsert<"customer_prices">;
type CustomerPriceEditorRow = Pick<
  Tables<"customer_prices">,
  "id" | "customer_id" | "product_id" | "price" | "is_active"
>;

async function fetchActiveCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, code, name, is_active")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CustomerRow[];
}

async function fetchProductsAndPrices(customerId: string) {
  const [productsResult, pricesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, code, name, specification, is_active")
      .order("code", { ascending: true }),
    supabase
      .from("customer_prices")
      .select("id, customer_id, product_id, price, is_active")
      .eq("customer_id", customerId),
  ]);

  if (productsResult.error) {
    throw productsResult.error;
  }
  if (pricesResult.error) {
    throw pricesResult.error;
  }

  return {
    products: (productsResult.data ?? []) as ProductRow[],
    prices: (pricesResult.data ?? []) as CustomerPriceEditorRow[],
  };
}

export function PriceManagement() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [activeDrafts, setActiveDrafts] = useState<Record<string, boolean>>({});

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", "active", "prices-menu"],
    queryFn: fetchActiveCustomers,
  });

  const { data: productPriceData, isLoading: isProductPriceLoading, refetch } = useQuery({
    queryKey: ["prices", "editor", selectedCustomerId],
    queryFn: async () => fetchProductsAndPrices(selectedCustomerId as string),
    enabled: !!selectedCustomerId,
  });

  const products = useMemo(() => productPriceData?.products ?? [], [productPriceData?.products]);

  const priceMap = useMemo(() => {
    const map = new Map<string, { price: number; isActive: boolean }>();
    for (const row of productPriceData?.prices ?? []) {
      if (row.product_id) {
        map.set(row.product_id, { price: row.price, isActive: row.is_active });
      }
    }
    return map;
  }, [productPriceData?.prices]);

  useEffect(() => {
    const nextPriceDrafts: Record<string, string> = {};
    const nextActiveDrafts: Record<string, boolean> = {};
    for (const product of products) {
      const current = priceMap.get(product.id);
      nextPriceDrafts[product.id] = current === undefined ? "" : String(current.price);
      // 거래처-품목 단가 행이 아직 없더라도, 등록된 품목은 기본적으로 ON에서 바로 편집 가능하게 한다.
      nextActiveDrafts[product.id] = current?.isActive ?? true;
    }
    setPriceDrafts(nextPriceDrafts);
    setActiveDrafts(nextActiveDrafts);
  }, [products, priceMap]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) {
        return;
      }

      const payload: CustomerPriceInsert[] = products.map((product) => {
        const isActive = activeDrafts[product.id] ?? false;
        const rawValue = (priceDrafts[product.id] ?? "").trim();
        const fallbackPrice = Number(priceMap.get(product.id)?.price ?? 0);
        const parsed = Number(rawValue);
        const safePrice = Number.isFinite(parsed) ? parsed : fallbackPrice;

        return {
          customer_id: selectedCustomerId,
          product_id: product.id,
          price: isActive ? safePrice : 0,
          is_active: isActive,
        };
      });

      const { error } = await supabase
        .from("customer_prices")
        .upsert(payload, { onConflict: "customer_id,product_id" });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await refetch();
      toast.success("단가가 성공적으로 저장되었습니다.");
    },
    onError: (error) => {
      toast.error(error.message || "단가 저장 중 오류가 발생했습니다.");
    },
  });

  const handlePriceChange = (productId: string, value: string) => {
    const numericOnly = value.replace(/[^\d]/g, "");
    setPriceDrafts((prev) => ({
      ...prev,
      [productId]: numericOnly,
    }));
  };
  const handleToggleActive = (productId: string, checked: boolean) => {
    setActiveDrafts((prev) => ({
      ...prev,
      [productId]: checked,
    }));
  };

  const selectedCustomer = customers?.find((customer) => customer.id === selectedCustomerId) ?? null;
  const totalCustomers = customers?.length ?? 0;
  const totalProducts = products.length;

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">단가 관리</h2>
          <p className="text-sm text-slate-600">거래처별 품목 단가를 빠르게 입력하고 저장합니다. (사용/미사용 품목 모두 표시)</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            총 거래처 수: {totalCustomers.toLocaleString()} / 전체 품목 수: {totalProducts.toLocaleString()}
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!selectedCustomerId || saveMutation.isPending}>
          단가 일괄 저장
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[30%_70%]">
        <CustomerListPanel
          customers={customers ?? []}
          selectedCustomerId={selectedCustomerId}
          isLoading={isCustomersLoading}
          onSelectCustomer={setSelectedCustomerId}
        />
        <PriceTablePanel
          products={products}
          drafts={priceDrafts}
          activeDrafts={activeDrafts}
          isLoading={isProductPriceLoading}
          selectedCustomerName={selectedCustomer?.name ?? null}
          onChangeDraft={handlePriceChange}
          onToggleActive={handleToggleActive}
        />
      </div>
    </section>
  );
}
