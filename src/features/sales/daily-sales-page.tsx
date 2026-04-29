"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";

import { ComboboxInput } from "./combobox-input";
import type { CustomerPriceRow, CustomerRow, ProductRow, SalesDailyInsert, SalesDailyRow } from "./types";

const SALES_QUERY_KEY = "sales-daily";

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchActiveCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, code, name, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, specification, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as ProductRow[];
}

type HandledProduct = {
  product: ProductRow;
  price: number;
};

async function fetchHandledProductsByCustomer(customerId: string) {
  const { data: priceRows, error: priceError } = await supabase
    .from("customer_prices")
    .select("product_id, price, is_active")
    .eq("customer_id", customerId)
    .eq("is_active", true);

  if (priceError) {
    throw priceError;
  }

  const validRows = (priceRows ?? []).filter((row) => !!row.product_id);
  const productIds = validRows
    .map((row) => row.product_id)
    .filter((productId): productId is string => typeof productId === "string");

  if (productIds.length === 0) {
    return [] as HandledProduct[];
  }

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, code, name, specification, is_active")
    .eq("is_active", true)
    .in("id", productIds);

  if (productError) {
    throw productError;
  }

  const productById = new Map<string, ProductRow>();
  for (const product of products ?? []) {
    productById.set(product.id, product as ProductRow);
  }

  const handledProducts: HandledProduct[] = [];
  for (const row of validRows) {
    const product = productById.get(row.product_id as string);
    if (product) {
      handledProducts.push({
        product,
        price: row.price,
      });
    }
  }

  return handledProducts;
}

async function fetchSalesByRange(fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from("sales_daily")
    .select(
      "id, customer_id, product_id, quantity, unit_price, recorded_unit_price, recorded_unit, total_amount, supply_date, remark, is_paid, delivery_status",
    )
    .gte("supply_date", fromDate)
    .lte("supply_date", toDate)
    .order("supply_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as SalesDailyRow[];
}

async function fetchCustomerPrice(customerId: string, productId: string) {
  const { data, error } = await supabase
    .from("customer_prices")
    .select("id, customer_id, product_id, price")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data ?? null) as CustomerPriceRow | null;
}

export function DailySalesPage() {
  const queryClient = useQueryClient();
  const today = getToday();
  const todayDate = new Date(today);

  const [rangeInput, setRangeInput] = useState<DateRange>({
    from: todayDate,
    to: todayDate,
  });
  const [rangeApplied, setRangeApplied] = useState<DateRange>({
    from: todayDate,
    to: todayDate,
  });

  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const quantityInputRef = useRef<HTMLInputElement | null>(null);

  const [customerKeyword, setCustomerKeyword] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState("");
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SalesDailyRow | null>(null);
  const [editQuantityText, setEditQuantityText] = useState("");
  const [editUnitPriceText, setEditUnitPriceText] = useState("");
  const [editRemark, setEditRemark] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "active", "sales-daily"],
    queryFn: fetchActiveCustomers,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "active", "sales-daily"],
    queryFn: fetchActiveProducts,
  });
  const { data: handledProducts = [] } = useQuery({
    queryKey: ["handled-products", selectedCustomerId],
    queryFn: () => fetchHandledProductsByCustomer(selectedCustomerId as string),
    enabled: !!selectedCustomerId,
  });

  const appliedFrom = (rangeApplied.from ?? todayDate).toISOString().slice(0, 10);
  const appliedTo = (rangeApplied.to ?? rangeApplied.from ?? todayDate).toISOString().slice(0, 10);

  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: [SALES_QUERY_KEY, appliedFrom, appliedTo],
    queryFn: () => fetchSalesByRange(appliedFrom, appliedTo),
    enabled: !!appliedFrom && !!appliedTo,
  });

  const { data: customerPrice } = useQuery({
    queryKey: ["customer-price", selectedCustomerId, selectedProductId],
    queryFn: () => fetchCustomerPrice(selectedCustomerId as string, selectedProductId as string),
    enabled: !!selectedCustomerId && !!selectedProductId,
  });

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );
  const selectedProduct = useMemo(() => {
    return handledProducts.find((item) => item.product.id === selectedProductId)?.product ?? null;
  }, [handledProducts, selectedProductId]);

  const filteredCustomers = useMemo(() => {
    const q = customerKeyword.trim().toLowerCase();
    if (!q) {
      return customers;
    }
    return customers.filter((item) => item.name.toLowerCase().includes(q));
  }, [customers, customerKeyword]);

  const filteredProducts = useMemo(() => {
    const q = productKeyword.trim().toLowerCase();
    const source = handledProducts.map((item) => item.product);
    if (!q) {
      return source;
    }
    return source.filter((item) => item.name.toLowerCase().includes(q));
  }, [handledProducts, productKeyword]);

  const unitPrice = customerPrice?.price ?? handledProducts.find((item) => item.product.id === selectedProductId)?.price ?? 0;
  const quantityNumber = Number(quantityText || 0);
  const canAdd = !!selectedCustomerId && !!selectedProductId && Number.isFinite(quantityNumber) && quantityNumber > 0;
  const totalAmount = unitPrice * quantityNumber;
  const entryDate = (rangeInput.from ?? todayDate).toISOString().slice(0, 10);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customers]);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.id, product.name);
    }
    return map;
  }, [products]);

  const resetForm = () => {
    setCustomerKeyword("");
    setProductKeyword("");
    setSelectedCustomerId(null);
    setSelectedProductId(null);
    setQuantityText("");
    setIsCustomerOpen(false);
    setIsProductOpen(false);
  };

  const insertMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId || !selectedProductId) {
        return;
      }

      const quantity = Number(quantityText || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const { data: existingRows, error: existingRowError } = await supabase
        .from("sales_daily")
        .select("id, quantity, unit_price, recorded_unit_price, recorded_unit, created_at")
        .eq("supply_date", entryDate)
        .eq("customer_id", selectedCustomerId)
        .eq("product_id", selectedProductId)
        .order("created_at", { ascending: false });

      if (existingRowError) {
        throw existingRowError;
      }

      const currentPrice = unitPrice;
      const matchedRow =
        (existingRows ?? []).find((row) => Number(row.recorded_unit_price ?? row.unit_price ?? 0) === currentPrice) ?? null;

      if (matchedRow) {
        const mergedQuantity = matchedRow.quantity + quantity;
        const mergedUnitPrice = currentPrice || matchedRow.recorded_unit_price || matchedRow.unit_price;
        const recordedUnit = matchedRow.recorded_unit ?? selectedProduct?.specification ?? null;
        const mergedTotalAmount = mergedUnitPrice * mergedQuantity;

        const { error: updateError } = await supabase
          .from("sales_daily")
          .update({
            quantity: mergedQuantity,
            unit_price: mergedUnitPrice,
            recorded_unit_price: mergedUnitPrice,
            recorded_unit: recordedUnit,
            total_amount: mergedTotalAmount,
          })
          .eq("id", matchedRow.id);

        if (updateError) {
          throw updateError;
        }
        return;
      }

      const payload: SalesDailyInsert = {
        supply_date: entryDate,
        customer_id: selectedCustomerId,
        product_id: selectedProductId,
        quantity,
        unit_price: unitPrice,
        recorded_unit_price: unitPrice,
        recorded_unit: selectedProduct?.specification ?? null,
        total_amount: unitPrice * quantity,
        is_paid: false,
        delivery_status: "pending",
      };

      const { error: insertError } = await supabase.from("sales_daily").insert(payload);
      if (insertError) {
        throw insertError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY, appliedFrom, appliedTo] });
      toast("저장됨");
      resetForm();
      customerInputRef.current?.focus();
    },
    onError: (error) => {
      toast.error(error.message || "저장 중 오류가 발생했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: SalesDailyRow) => {
      if (row.delivery_status === "confirmed") {
        throw new Error("배송 확정된 내역은 삭제할 수 없습니다.");
      }

      const { data: latestRow, error: checkError } = await supabase
        .from("sales_daily")
        .select("id, delivery_status")
        .eq("id", row.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (latestRow?.delivery_status === "confirmed") {
        throw new Error("배송 확정된 내역은 삭제할 수 없습니다.");
      }

      const { error } = await supabase.from("sales_daily").delete().eq("id", row.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY, appliedFrom, appliedTo] });
    },
    onError: (error) => {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) {
        return;
      }
      if (editingRow.delivery_status === "confirmed") {
        throw new Error("배송 확정된 내역은 수정할 수 없습니다.");
      }

      const quantity = Number(editQuantityText || 0);
      const unitPrice = Number(editUnitPriceText || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("수량을 올바르게 입력해 주세요.");
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("단가를 올바르게 입력해 주세요.");
      }

      const { error } = await supabase
        .from("sales_daily")
        .update({
          quantity,
          unit_price: unitPrice,
          recorded_unit_price: unitPrice,
          recorded_unit: editingRow.recorded_unit ?? null,
          total_amount: quantity * unitPrice,
          remark: editRemark.trim() || null,
        })
        .eq("id", editingRow.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("수정되었습니다.");
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY, appliedFrom, appliedTo] });
    },
    onError: (error) => {
      toast.error(error.message || "수정 중 오류가 발생했습니다.");
    },
  });

  const pickCustomer = (id: string, label: string) => {
    setSelectedCustomerId(id);
    setCustomerKeyword(label);
    setSelectedProductId(null);
    setProductKeyword("");
  };

  const pickProduct = (id: string, label: string) => {
    setSelectedProductId(id);
    setProductKeyword(label);
  };

  const moveCustomerToProduct = () => {
    if (!selectedCustomerId && filteredCustomers.length > 0) {
      const first = filteredCustomers[0];
      pickCustomer(first.id, first.name);
    }
    setIsCustomerOpen(false);
    productInputRef.current?.focus();
    setIsProductOpen(true);
  };

  const moveProductToQuantity = () => {
    if (!selectedProductId && filteredProducts.length > 0) {
      const first = filteredProducts[0];
      pickProduct(first.id, first.name);
    }
    setIsProductOpen(false);
    quantityInputRef.current?.focus();
    quantityInputRef.current?.select();
  };

  const onCustomerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    moveCustomerToProduct();
  };

  const onProductKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    moveProductToQuantity();
  };

  const onQuantityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (canAdd) {
      insertMutation.mutate();
    }
  };

  const applyRange = () => {
    setRangeApplied({
      from: rangeInput.from ?? todayDate,
      to: rangeInput.to ?? rangeInput.from ?? todayDate,
    });
  };

  const openEditDialog = (row: SalesDailyRow) => {
    setEditingRow(row);
    setEditQuantityText(String(row.quantity));
    setEditUnitPriceText(String(row.recorded_unit_price ?? row.unit_price));
    setEditRemark(row.remark ?? "");
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">조회 기간</p>
          <DateRangePicker value={rangeInput} onChange={(next) => next && setRangeInput(next)} className="w-[300px]" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium opacity-0">조회</p>
          <Button type="button" onClick={applyRange}>
            기간 조회
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1.3fr_0.8fr_0.7fr_0.9fr_auto]">
          <div className="space-y-1">
            <p className="text-xs text-slate-600">거래처</p>
            <ComboboxInput
              id="sales-customer"
              inputRef={customerInputRef}
              value={customerKeyword}
              placeholder="거래처 검색"
              isOpen={isCustomerOpen}
              options={filteredCustomers.map((customer) => ({
                id: customer.id,
                label: customer.name,
                subLabel: customer.code,
              }))}
              onOpen={() => setIsCustomerOpen(true)}
              onClose={() => setIsCustomerOpen(false)}
              onChangeValue={(next) => {
                setCustomerKeyword(next);
                if (selectedCustomer?.name !== next) {
                  setSelectedCustomerId(null);
                }
              }}
              onSelect={(option) => pickCustomer(option.id, option.label)}
              onKeyDown={onCustomerKeyDown}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">품목</p>
            <ComboboxInput
              id="sales-product"
              inputRef={productInputRef}
              value={productKeyword}
              placeholder="품목 검색"
              isOpen={isProductOpen}
              options={filteredProducts.map((product) => ({
                id: product.id,
                label: product.name,
                subLabel: product.code,
              }))}
              onOpen={() => setIsProductOpen(true)}
              onClose={() => setIsProductOpen(false)}
              onChangeValue={(next) => {
                setProductKeyword(next);
                if (selectedProduct?.name !== next) {
                  setSelectedProductId(null);
                }
              }}
              onSelect={(option) => pickProduct(option.id, option.label)}
              onKeyDown={onProductKeyDown}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">수량</p>
            <Input
              ref={quantityInputRef}
              value={quantityText}
              inputMode="numeric"
              placeholder="0"
              onChange={(event) => setQuantityText(event.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={onQuantityKeyDown}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">단가</p>
            <div className="flex h-9 items-center rounded-md border bg-slate-50 px-3 text-sm">{unitPrice.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">합계</p>
            <div className="flex h-9 items-center rounded-md border bg-slate-50 px-3 text-sm font-semibold">
              {totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-transparent">추가</p>
            <Button
              type="button"
              onClick={() => insertMutation.mutate()}
              disabled={insertMutation.isPending || !canAdd}
            >
              추가
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="border-b px-4 py-3 text-sm font-semibold">판매 내역 ({appliedFrom} ~ {appliedTo})</div>
        <div className="max-h-[480px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>거래처</TableHead>
                <TableHead>품목</TableHead>
                <TableHead>배송 상태</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead className="w-[96px]">수정</TableHead>
                <TableHead className="w-[96px]">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSalesLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                    데이터를 불러오는 중입니다...
                  </TableCell>
                </TableRow>
              )}
              {!isSalesLoading && sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                    해당 기간의 판매 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {!isSalesLoading &&
                sales.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.customer_id ? customerNameById.get(row.customer_id) ?? "-" : "-"}</TableCell>
                    <TableCell>{row.product_id ? productNameById.get(row.product_id) ?? "-" : "-"}</TableCell>
                    <TableCell>
                      {row.delivery_status === "confirmed" ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">배송 확정</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">대기</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(row.recorded_unit_price ?? row.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{row.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(row)}
                        disabled={row.delivery_status === "confirmed"}
                      >
                        수정
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(row)}
                        disabled={deleteMutation.isPending || row.delivery_status === "confirmed"}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>판매 내역 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">수량</p>
              <Input
                value={editQuantityText}
                inputMode="numeric"
                onChange={(event) => setEditQuantityText(event.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">단가</p>
              <Input
                value={editUnitPriceText}
                inputMode="numeric"
                onChange={(event) => setEditUnitPriceText(event.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">비고</p>
              <Input value={editRemark} onChange={(event) => setEditRemark(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
