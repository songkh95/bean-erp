"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { CustomerRow } from "./types";

type CustomerListPanelProps = {
  customers: CustomerRow[];
  selectedCustomerId: string | null;
  isLoading: boolean;
  onSelectCustomer: (customerId: string) => void;
};

export function CustomerListPanel({
  customers,
  selectedCustomerId,
  isLoading,
  onSelectCustomer,
}: CustomerListPanelProps) {
  const [keyword, setKeyword] = useState("");

  const filteredCustomers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return customers;
    }

    return customers.filter((customer) => customer.name.toLowerCase().includes(normalized));
  }, [customers, keyword]);

  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3 text-sm font-semibold">활성 거래처</div>
      <div className="border-b p-2">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="거래처명 검색"
          aria-label="거래처 검색"
        />
      </div>
      <div className="max-h-[560px] overflow-y-auto p-2">
        {isLoading && <p className="px-2 py-3 text-sm text-slate-500">불러오는 중...</p>}
        {!isLoading && customers.length === 0 && <p className="px-2 py-3 text-sm text-slate-500">활성 거래처가 없습니다.</p>}
        {!isLoading && customers.length > 0 && filteredCustomers.length === 0 && (
          <p className="px-2 py-3 text-sm text-slate-500">검색 결과가 없습니다.</p>
        )}
        {filteredCustomers.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => onSelectCustomer(customer.id)}
            className={cn(
              "mb-1 w-full rounded-md border px-3 py-2 text-left text-sm",
              selectedCustomerId === customer.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-transparent hover:border-slate-200 hover:bg-slate-50",
            )}
          >
            <div className="font-medium">{customer.name}</div>
            <div className="text-xs opacity-80">{customer.code}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
