"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { companyProfileQueryKey, fetchCompanyProfileForUser } from "@/lib/queries/company-profile";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

import { ComboboxInput } from "../sales/combobox-input";

type CustomerRow = Tables<"customers">;
type ProductRow = Tables<"products">;
type SalesRow = Tables<"sales_daily">;
type PivotRow = {
  date: string;
  quantityByProduct: Record<string, number>;
  amountByProduct: Record<string, number>;
  totalQuantity: number;
  totalAmount: number;
};
type PivotSummaryByProduct = {
  unitPrice: number;
  quantity: number;
  amount: number;
};
type PivotColumn = {
  key: string;
  productName: string;
  unitPrice: number;
};

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, code, name, ceo_name, business_number, phone, address, note")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as ProductRow[];
}

async function fetchInvoiceSales(startDate: string, endDate: string, customerId: string | null) {
  let query = supabase
    .from("sales_daily")
    .select("id, supply_date, customer_id, product_id, quantity, unit_price, recorded_unit_price, recorded_unit, total_amount, remark")
    .gte("supply_date", startDate)
    .lte("supply_date", endDate)
    .order("supply_date", { ascending: true });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as SalesRow[];
}

function formatBusinessNumber(value: string | null | undefined) {
  const raw = (value ?? "").replace(/[^\d]/g, "");
  if (raw.length !== 10) {
    return value ?? "-";
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
}

function getInvoiceTitle(dateString: string) {
  const [year, month] = dateString.split("-");
  if (!year || !month) {
    return "거래명세서";
  }
  return `${Number(year)}년 ${Number(month)}월 거래명세서`;
}

type InvoicePageProps = {
  forcePivotMode?: boolean;
};

export function InvoicePage({ forcePivotMode = false }: InvoicePageProps) {
  const queryClient = useQueryClient();
  const [startDateInput, setStartDateInput] = useState(getMonthStart());
  const [endDateInput, setEndDateInput] = useState(getToday());
  const [customerKeyword, setCustomerKeyword] = useState("전체");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);

  const [appliedStartDate, setAppliedStartDate] = useState(getMonthStart());
  const [appliedEndDate, setAppliedEndDate] = useState(getToday());
  const [appliedCustomerId, setAppliedCustomerId] = useState<string | null>(null);
  const [excludedRowIds, setExcludedRowIds] = useState<Record<string, true>>({});
  const isPivotView = forcePivotMode;

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "invoice-filter"],
    queryFn: fetchCustomers,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "invoice-table"],
    queryFn: fetchProducts,
  });

  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["invoice-sales", appliedStartDate, appliedEndDate, appliedCustomerId ?? "all"],
    queryFn: () => fetchInvoiceSales(appliedStartDate, appliedEndDate, appliedCustomerId),
    enabled: !!appliedStartDate && !!appliedEndDate,
  });
  const { data: companyProfile } = useQuery({
    queryKey: companyProfileQueryKey,
    queryFn: fetchCompanyProfileForUser,
  });

  const filteredCustomers = useMemo(() => {
    const q = customerKeyword.trim().toLowerCase();
    const allOption: CustomerRow = {
      id: "all",
      code: "ALL",
      name: "전체",
      business_number: null,
      company_id: null,
      address: null,
      ceo_name: null,
      created_at: null,
      is_active: null,
      note: null,
      phone: null,
      region_id: null,
      tax_type: null,
      updated_at: null,
    };
    if (!q || "전체".includes(q)) {
      return [allOption, ...customers];
    }
    const matched = customers.filter((item) => item.name.toLowerCase().includes(q));
    return [allOption, ...matched];
  }, [customerKeyword, customers]);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customers]);

  const productById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const product of products) {
      map.set(product.id, product);
    }
    return map;
  }, [products]);

  const selectedSales = useMemo(() => sales.filter((row) => !excludedRowIds[row.id]), [excludedRowIds, sales]);
  const selectedTotalQuantity = useMemo(
    () => selectedSales.reduce((sum, row) => sum + row.quantity, 0),
    [selectedSales],
  );
  const selectedTotalAmount = useMemo(
    () => selectedSales.reduce((sum, row) => sum + row.total_amount, 0),
    [selectedSales],
  );
  const pivotSourceSales = useMemo(() => {
    if (!isPivotView) {
      return [] as SalesRow[];
    }
    if (!appliedCustomerId) {
      return selectedSales;
    }
    return selectedSales.filter((row) => row.customer_id === appliedCustomerId);
  }, [appliedCustomerId, isPivotView, selectedSales]);
  const pivotColumns = useMemo<PivotColumn[]>(() => {
    const map = new Map<string, PivotColumn>();
    for (const row of pivotSourceSales) {
      const product = row.product_id ? productById.get(row.product_id) : null;
      const productName = product?.name?.trim() || "미분류";
      const unitPrice = Number(row.recorded_unit_price ?? row.unit_price ?? 0);
      const key = `${productName}__${unitPrice}`;
      if (!map.has(key)) {
        map.set(key, { key, productName, unitPrice });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const nameCompare = a.productName.localeCompare(b.productName, "ko");
      if (nameCompare !== 0) return nameCompare;
      return a.unitPrice - b.unitPrice;
    });
  }, [pivotSourceSales, productById]);
  const pivotRows = useMemo<PivotRow[]>(() => {
    const byDate = new Map<string, PivotRow>();
    for (const row of pivotSourceSales) {
      const product = row.product_id ? productById.get(row.product_id) : null;
      const productName = product?.name?.trim() || "미분류";
      const unitPrice = Number(row.recorded_unit_price ?? row.unit_price ?? 0);
      const productLabel = `${productName}__${unitPrice}`;
      const dateKey = row.supply_date;
      const current = byDate.get(dateKey) ?? {
        date: dateKey,
        quantityByProduct: {},
        amountByProduct: {},
        totalQuantity: 0,
        totalAmount: 0,
      };
      const quantity = Number(row.quantity ?? 0);
      const amount = Number(row.total_amount ?? 0);
      current.quantityByProduct[productLabel] = (current.quantityByProduct[productLabel] ?? 0) + quantity;
      current.amountByProduct[productLabel] = (current.amountByProduct[productLabel] ?? 0) + amount;
      current.totalQuantity += quantity;
      current.totalAmount += amount;
      byDate.set(dateKey, current);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [pivotSourceSales, productById]);
  const pivotSummaryByProduct = useMemo<Record<string, PivotSummaryByProduct>>(() => {
    const summary: Record<string, PivotSummaryByProduct> = {};
    for (const row of pivotSourceSales) {
      const product = row.product_id ? productById.get(row.product_id) : null;
      const productName = product?.name?.trim() || "미분류";
      const unitPrice = Number(row.recorded_unit_price ?? row.unit_price ?? 0);
      const productLabel = `${productName}__${unitPrice}`;
      summary[productLabel] = summary[productLabel] ?? { unitPrice, quantity: 0, amount: 0 };
      summary[productLabel].quantity += Number(row.quantity ?? 0);
      summary[productLabel].amount += Number(row.total_amount ?? 0);
    }
    return summary;
  }, [pivotSourceSales, productById]);
  const pivotColumnCount = pivotColumns.length * 2 + 2;
  const isPivotWide = pivotColumnCount >= 10;
  const pivotProductGroups = useMemo(() => {
    const groupSize = pivotColumns.length > 8 ? 6 : pivotColumns.length || 1;
    const groups: PivotColumn[][] = [];
    for (let index = 0; index < pivotColumns.length; index += groupSize) {
      groups.push(pivotColumns.slice(index, index + groupSize));
    }
    return groups.length > 0 ? groups : [[]];
  }, [pivotColumns]);
  const allSelected = sales.length > 0 && selectedSales.length === sales.length;
  const selectedCustomerForPrint = useMemo(() => {
    if (appliedCustomerId) {
      return customers.find((customer) => customer.id === appliedCustomerId) ?? null;
    }
    const firstCustomerId = selectedSales.find((row) => !!row.customer_id)?.customer_id;
    if (!firstCustomerId) {
      return null;
    }
    return customers.find((customer) => customer.id === firstCustomerId) ?? null;
  }, [appliedCustomerId, customers, selectedSales]);
  const bankAccount = companyProfile?.bank_accounts?.[0] ?? null;
  const applyFilters = () => {
    setAppliedStartDate(startDateInput);
    setAppliedEndDate(endDateInput);
    setAppliedCustomerId(selectedCustomerId);
    setExcludedRowIds({});
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setExcludedRowIds((prev) => {
      if (checked) {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: true };
    });
  };

  const toggleAllSelection = (checked: boolean) => {
    if (checked) {
      setExcludedRowIds({});
      return;
    }
    const next: Record<string, true> = {};
    for (const row of sales) {
      next[row.id] = true;
    }
    setExcludedRowIds(next);
  };

  const deleteMutation = useMutation({
    mutationFn: async (row: SalesRow) => {
      if (row.delivery_status === "confirmed") {
        throw new Error("배송 확정된 내역은 삭제할 수 없습니다.");
      }
      const { error } = await supabase.from("sales_daily").delete().eq("id", row.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("삭제되었습니다.");
      await queryClient.invalidateQueries({
        queryKey: ["invoice-sales", appliedStartDate, appliedEndDate, appliedCustomerId ?? "all"],
      });
    },
    onError: (error) => {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.");
    },
  });

  return (
    <section
      className={`space-y-4 rounded-lg border bg-white p-6 invoice-page ${isPivotView ? "invoice-pivot-enabled" : ""} ${isPivotWide ? "invoice-pivot-wide" : ""}`}
    >
      <div className="invoice-no-print flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">거래명세서 발행 및 내역 조회</h2>
          <p className="text-sm text-slate-600">기간/거래처 조건으로 판매 내역을 조회하고 명세서를 인쇄합니다.</p>
        </div>
        <Button type="button" onClick={() => window.print()}>
          선택 항목 인쇄(PDF)
        </Button>
      </div>

      <div className="invoice-no-print rounded-md border p-3">
        <div className="grid gap-3 lg:grid-cols-[160px_160px_1fr_auto]">
          <div className="space-y-1">
            <p className="text-xs text-slate-600">시작일</p>
            <Input type="date" value={startDateInput} onChange={(event) => setStartDateInput(event.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">종료일</p>
            <Input type="date" value={endDateInput} onChange={(event) => setEndDateInput(event.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">거래처</p>
            <ComboboxInput
              id="invoice-customer"
              value={customerKeyword}
              placeholder="전체 또는 거래처 검색"
              isOpen={isCustomerOpen}
              options={filteredCustomers.map((customer) => ({
                id: customer.id,
                label: customer.name,
                subLabel: customer.id === "all" ? "전체 거래처 조회" : customer.code,
              }))}
              onOpen={() => setIsCustomerOpen(true)}
              onClose={() => setIsCustomerOpen(false)}
              onChangeValue={(next) => {
                setCustomerKeyword(next);
                if (next !== "전체") {
                  const found = customers.find((customer) => customer.name === next);
                  setSelectedCustomerId(found?.id ?? null);
                } else {
                  setSelectedCustomerId(null);
                }
              }}
              onSelect={(option) => {
                if (option.id === "all") {
                  setSelectedCustomerId(null);
                  setCustomerKeyword("전체");
                  return;
                }
                setSelectedCustomerId(option.id);
                setCustomerKeyword(option.label);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                event.preventDefault();
                setIsCustomerOpen(false);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={applyFilters}>
              조회
            </Button>
          </div>
        </div>
      </div>

      <div className="invoice-print-header hidden">
        <h1 className="text-center text-3xl font-bold tracking-tight">{getInvoiceTitle(appliedStartDate)}</h1>
        <table className="invoice-print-meta-table mt-3">
          <tbody>
            <tr>
              <th>구분</th>
              <th>공급자 (공장)</th>
              <th>공급받는 자</th>
            </tr>
            <tr>
              <th>상호명</th>
              <td>{companyProfile?.name ?? "-"}</td>
              <td>{selectedCustomerForPrint?.name ?? "전체 거래처"}</td>
            </tr>
            <tr>
              <th>대표자</th>
              <td>{companyProfile?.ceo_name ?? "-"}</td>
              <td>{selectedCustomerForPrint?.ceo_name ?? "-"}</td>
            </tr>
            <tr>
              <th>사업자번호</th>
              <td>{formatBusinessNumber(companyProfile?.business_number)}</td>
              <td>{formatBusinessNumber(selectedCustomerForPrint?.business_number)}</td>
            </tr>
            <tr>
              <th>연락처</th>
              <td>{companyProfile?.phone ?? "-"}</td>
              <td>{selectedCustomerForPrint?.phone ?? "-"}</td>
            </tr>
            <tr>
              <th>주소</th>
              <td>{companyProfile?.address ?? "-"}</td>
              <td>{selectedCustomerForPrint?.address ?? "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {isPivotView && (
        <div className="invoice-no-print rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {isPivotWide
            ? `품목이 많아 표를 ${pivotProductGroups.length}개로 자동 분할해 표시합니다. PDF 저장 시 가로 방향(Landscape)을 권장합니다.`
            : "선택 기간의 품목별 집계 명세서입니다."}
        </div>
      )}

      {!isPivotView && (
        <div className="rounded-md border invoice-table-wrap">
          <div className="border-b px-4 py-3 text-sm font-semibold">
            판매 내역 ({appliedStartDate} ~ {appliedEndDate})
          </div>
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleAllSelection(!!checked)} />
                  </TableHead>
                  <TableHead>일자</TableHead>
                  <TableHead>거래처</TableHead>
                  <TableHead>품목명</TableHead>
                  <TableHead>규격</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-right">공급가액</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead className="w-[96px]">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSalesLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-slate-500">
                      데이터를 불러오는 중입니다...
                    </TableCell>
                  </TableRow>
                )}
                {!isSalesLoading && sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-slate-500">
                      조회된 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {!isSalesLoading &&
                  sales.map((row) => {
                    const product = row.product_id ? productById.get(row.product_id) : null;
                    const checked = !excludedRowIds[row.id];
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox checked={checked} onCheckedChange={(next) => toggleRowSelection(row.id, !!next)} />
                        </TableCell>
                        <TableCell>{row.supply_date}</TableCell>
                        <TableCell>{row.customer_id ? customerNameById.get(row.customer_id) ?? "-" : "-"}</TableCell>
                        <TableCell>{product?.name ?? "-"}</TableCell>
                        <TableCell>{row.recorded_unit ?? "-"}</TableCell>
                        <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Number(row.recorded_unit_price ?? row.unit_price).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.total_amount.toLocaleString()}</TableCell>
                        <TableCell>{row.remark ?? "-"}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const ok = window.confirm("선택한 판매 내역을 삭제하시겠습니까?");
                              if (!ok || deleteMutation.isPending) {
                                return;
                              }
                              deleteMutation.mutate(row);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            삭제
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {!isSalesLoading && sales.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold">
                      합계
                    </TableCell>
                    <TableCell className="text-right font-bold">{selectedTotalQuantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">-</TableCell>
                    <TableCell className="text-right font-bold">{selectedTotalAmount.toLocaleString()}</TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {isPivotView && (
        <div className="invoice-no-print space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            거래처: {appliedCustomerId ? selectedCustomerForPrint?.name ?? "-" : "전체 거래처"} / 기간: {appliedStartDate} ~ {appliedEndDate}
          </div>
          {pivotProductGroups.map((group, groupIndex) => (
            <div key={`pivot-group-${groupIndex}`} className="rounded-md border invoice-pivot-wrap">
              <div className="border-b px-4 py-2 text-xs font-semibold text-slate-600">
                품목 그룹 {groupIndex + 1} / {pivotProductGroups.length}
              </div>
              <div className="max-h-[520px] overflow-auto">
                <Table className={`invoice-pivot-grid ${isPivotWide ? "text-xs" : ""}`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[110px]" rowSpan={2}>
                        공급일자
                      </TableHead>
                      {group.map((column) => (
                        <TableHead key={`pivot-header-${groupIndex}-${column.key}`} className="min-w-[160px] text-center" colSpan={2}>
                          {column.productName} ({column.unitPrice.toLocaleString()}원)
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[90px] text-right" rowSpan={2}>
                        일자별 합계
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      {group.flatMap((column) => [
                        <TableHead key={`pivot-header-qty-${groupIndex}-${column.key}`} className="min-w-[70px] text-right">
                          수량
                        </TableHead>,
                        <TableHead key={`pivot-header-amt-${groupIndex}-${column.key}`} className="min-w-[90px] text-right">
                          금액
                        </TableHead>,
                      ])}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivotRows.map((row) => (
                      <TableRow key={`pivot-row-${groupIndex}-${row.date}`}>
                        <TableCell>{row.date}</TableCell>
                        {group.flatMap((column) => [
                          <TableCell key={`pivot-cell-qty-${groupIndex}-${row.date}-${column.key}`} className="text-right">
                            {(row.quantityByProduct[column.key] ?? 0).toLocaleString()}
                          </TableCell>,
                          <TableCell key={`pivot-cell-amt-${groupIndex}-${row.date}-${column.key}`} className="text-right">
                            {(row.amountByProduct[column.key] ?? 0).toLocaleString()}
                          </TableCell>,
                        ])}
                        <TableCell className="text-right font-semibold">
                          {row.totalQuantity.toLocaleString()} / {row.totalAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {pivotRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={group.length * 2 + 2} className="py-8 text-center text-slate-500">
                          집계할 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                    {pivotRows.length > 0 && (
                      <TableRow className="bg-slate-50">
                        <TableCell className="font-semibold">품목별 소계</TableCell>
                        {group.flatMap((column) => {
                          const summary = pivotSummaryByProduct[column.key] ?? { unitPrice: column.unitPrice, quantity: 0, amount: 0 };
                          return [
                            <TableCell key={`pivot-subtotal-qty-${groupIndex}-${column.key}`} className="text-right font-semibold">
                              {summary.quantity.toLocaleString()}
                            </TableCell>,
                            <TableCell key={`pivot-subtotal-amt-${groupIndex}-${column.key}`} className="text-right font-semibold">
                              {summary.amount.toLocaleString()}
                            </TableCell>,
                          ];
                        })}
                        <TableCell className="text-right font-semibold">
                          {pivotSourceSales.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0).toLocaleString()} /{" "}
                          {pivotSourceSales.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="invoice-print-selected hidden rounded-md border">
        <table className="invoice-print-detail-table">
          <thead>
            <tr>
              <th>공급일자</th>
              <th>품목명</th>
              <th>수량</th>
              <th>단가</th>
              <th>공급가액</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {selectedSales.map((row) => {
              const product = row.product_id ? productById.get(row.product_id) : null;
              return (
                <tr key={`print-${row.id}`}>
                  <td>{row.supply_date}</td>
                  <td>{[product?.name, row.recorded_unit].filter(Boolean).join(" ") || "-"}</td>
                  <td className="text-center">{row.quantity.toLocaleString()}</td>
                  <td className="text-right">{Number(row.recorded_unit_price ?? row.unit_price).toLocaleString()}</td>
                  <td className="text-right">{row.total_amount.toLocaleString()}</td>
                  <td>{row.remark ?? "-"}</td>
                </tr>
              );
            })}
            {selectedSales.length > 0 && (
              <tr>
                <td colSpan={2} className="text-center font-bold">
                  합계
                </td>
                <td className="text-center font-bold">{selectedTotalQuantity.toLocaleString()}</td>
                <td />
                <td className="text-right font-bold">{selectedTotalAmount.toLocaleString()}</td>
                <td />
              </tr>
            )}
            <tr>
              <th>입금계좌</th>
              <td colSpan={5}>
                {bankAccount
                  ? `${bankAccount.bank_name} ${bankAccount.account_number} / ${bankAccount.account_holder}`
                  : "내 설정에서 입금계좌를 등록해 주세요."}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="invoice-print-pivot hidden rounded-md border">
        {pivotProductGroups.map((group, groupIndex) => (
          <table key={`print-pivot-group-${groupIndex}`} className={`invoice-print-pivot-table ${isPivotWide ? "invoice-print-pivot-wide" : ""}`}>
            <thead>
              <tr>
                <th rowSpan={2}>공급일자</th>
                {group.map((column) => (
                  <th key={`print-pivot-header-${groupIndex}-${column.key}`} colSpan={2}>
                    {column.productName} ({column.unitPrice.toLocaleString()}원)
                  </th>
                ))}
                <th rowSpan={2}>일자별 합계</th>
              </tr>
              <tr>
                {group.flatMap((column) => [
                  <th key={`print-pivot-header-qty-${groupIndex}-${column.key}`}>수량</th>,
                  <th key={`print-pivot-header-amt-${groupIndex}-${column.key}`}>금액</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((row) => (
                <tr key={`print-pivot-row-${groupIndex}-${row.date}`}>
                  <td>{row.date}</td>
                  {group.flatMap((column) => [
                    <td key={`print-pivot-cell-qty-${groupIndex}-${row.date}-${column.key}`} className="text-right">
                      {(row.quantityByProduct[column.key] ?? 0).toLocaleString()}
                    </td>,
                    <td key={`print-pivot-cell-amt-${groupIndex}-${row.date}-${column.key}`} className="text-right">
                      {(row.amountByProduct[column.key] ?? 0).toLocaleString()}
                    </td>,
                  ])}
                  <td className="text-right font-bold">
                    {row.totalQuantity.toLocaleString()} / {row.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {pivotRows.length > 0 && (
                <tr>
                  <td className="font-bold">품목별 소계</td>
                  {group.flatMap((column) => {
                    const summary = pivotSummaryByProduct[column.key] ?? { unitPrice: column.unitPrice, quantity: 0, amount: 0 };
                    return [
                      <td key={`print-pivot-subtotal-qty-${groupIndex}-${column.key}`} className="text-right font-bold">
                        {summary.quantity.toLocaleString()}
                      </td>,
                      <td key={`print-pivot-subtotal-amt-${groupIndex}-${column.key}`} className="text-right font-bold">
                        {summary.amount.toLocaleString()}
                      </td>,
                    ];
                  })}
                  <td className="text-right font-bold">
                    {pivotSourceSales.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0).toLocaleString()} /{" "}
                    {pivotSourceSales.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0).toLocaleString()}
                  </td>
                </tr>
              )}
              {pivotRows.length === 0 && (
                <tr>
                  <td colSpan={group.length * 2 + 2} className="text-center">
                    집계할 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ))}
        {isPivotWide && (
          <p className="mt-2 text-xs text-slate-700">품목 수가 많습니다. 인쇄 설정에서 가로 방향(Landscape)으로 저장하면 가독성이 좋아집니다.</p>
        )}
      </div>

      <style jsx global>{`
        .invoice-pivot-grid th,
        .invoice-pivot-grid td {
          border-left: 1px solid #cbd5e1;
          border-right: 1px solid #cbd5e1;
        }

        @media print {
          aside {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .invoice-no-print {
            display: none !important;
          }
          .invoice-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-table-wrap {
            border: none !important;
          }
          .invoice-table-wrap {
            display: none !important;
          }
          .invoice-print-selected {
            display: block !important;
            border: none !important;
          }
          .invoice-pivot-enabled .invoice-print-selected {
            display: none !important;
          }
          .invoice-pivot-enabled .invoice-print-pivot {
            display: block !important;
            border: none !important;
          }
          .invoice-print-header {
            display: block !important;
            margin-bottom: 16px;
          }
          .invoice-print-meta-table,
          .invoice-print-detail-table,
          .invoice-print-pivot-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
          }
          .invoice-print-meta-table th,
          .invoice-print-meta-table td,
          .invoice-print-detail-table th,
          .invoice-print-detail-table td,
          .invoice-print-pivot-table th,
          .invoice-print-pivot-table td {
            border: 1px solid #444;
            padding: 4px 6px;
            vertical-align: middle;
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .invoice-print-meta-table th {
            background: #f3f4f6;
            text-align: center;
          }
          .invoice-print-detail-table th {
            text-align: center;
          }
          .invoice-print-detail-table td.text-right {
            text-align: right !important;
            font-variant-numeric: tabular-nums;
          }
          .invoice-print-pivot-table th {
            text-align: center;
          }
          .invoice-print-pivot-table td.text-right {
            text-align: right !important;
            font-variant-numeric: tabular-nums;
          }
          .invoice-print-pivot table + table,
          .invoice-print-pivot-table + .invoice-print-pivot-table {
            margin-top: 8px;
            page-break-before: always;
          }
          .invoice-print-pivot-wide {
            font-size: 10px !important;
          }
        }
      `}</style>
    </section>
  );
}
