"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { ProductRow } from "./types";

type PriceTablePanelProps = {
  products: ProductRow[];
  drafts: Record<string, string>;
  activeDrafts: Record<string, boolean>;
  isLoading: boolean;
  selectedCustomerName: string | null;
  onChangeDraft: (productId: string, value: string) => void;
  onToggleActive: (productId: string, checked: boolean) => void;
};

export function PriceTablePanel({
  products,
  drafts,
  activeDrafts,
  isLoading,
  selectedCustomerName,
  onChangeDraft,
  onToggleActive,
}: PriceTablePanelProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const onProducts = products.filter((product) => activeDrafts[product.id]);
  const offProducts = products.filter((product) => !activeDrafts[product.id]);

  const moveToNextInput = (productId: string) => {
    const currentIndex = onProducts.findIndex((product) => product.id === productId);
    const nextProduct = onProducts[currentIndex + 1];
    if (!nextProduct) {
      return;
    }
    inputRefs.current[nextProduct.id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, productId: string) => {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    moveToNextInput(productId);
  };

  if (!selectedCustomerName) {
    return (
      <div className="flex min-h-[560px] items-center justify-center rounded-md border text-sm text-slate-500">
        거래처를 선택해 주세요
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3 text-sm font-semibold">{selectedCustomerName} 단가표</div>
      <div className="max-h-[560px] space-y-6 overflow-auto p-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-emerald-700">사용 중인 품목 (ON)</h3>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목코드</TableHead>
              <TableHead>품목명</TableHead>
              <TableHead>규격</TableHead>
              <TableHead className="w-[110px]">취급</TableHead>
              <TableHead className="w-[180px]">단가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                  데이터를 불러오는 중입니다...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                  등록된 활성 품목이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              onProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.specification ?? "-"}</TableCell>
                  <TableCell>
                    <Switch checked={!!activeDrafts[product.id]} onCheckedChange={(checked) => onToggleActive(product.id, checked)} />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={drafts[product.id] ?? ""}
                      ref={(el) => {
                        inputRefs.current[product.id] = el;
                      }}
                      onChange={(event) => onChangeDraft(product.id, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(event, product.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && onProducts.length === 0 && products.length > 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                  사용 중인 품목이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">미사용 품목 (OFF)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>품목코드</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead>규격</TableHead>
                <TableHead className="w-[110px]">취급</TableHead>
                <TableHead className="w-[180px]">단가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading &&
                offProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.specification ?? "-"}</TableCell>
                    <TableCell>
                      <Switch checked={!!activeDrafts[product.id]} onCheckedChange={(checked) => onToggleActive(product.id, checked)} />
                    </TableCell>
                    <TableCell className="text-slate-400">-</TableCell>
                  </TableRow>
                ))}
              {!isLoading && offProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    미사용 품목이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
