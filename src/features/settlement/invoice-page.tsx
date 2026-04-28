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
    .select("id, code, name, specification")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as ProductRow[];
}

async function fetchInvoiceSales(startDate: string, endDate: string, customerId: string | null) {
  let query = supabase
    .from("sales_daily")
    .select("id, supply_date, customer_id, product_id, quantity, unit_price, total_amount, remark")
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

export function InvoicePage() {
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
    <section className="space-y-4 rounded-lg border bg-white p-6 invoice-page">
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
                      <TableCell>{product?.specification ?? "-"}</TableCell>
                      <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.unit_price.toLocaleString()}</TableCell>
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
                  <td>{[product?.name, product?.specification].filter(Boolean).join(" ") || "-"}</td>
                  <td className="text-center">{row.quantity.toLocaleString()}</td>
                  <td className="text-right">{row.unit_price.toLocaleString()}</td>
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

      <style jsx global>{`
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
          .invoice-print-header {
            display: block !important;
            margin-bottom: 16px;
          }
          .invoice-print-meta-table,
          .invoice-print-detail-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
          }
          .invoice-print-meta-table th,
          .invoice-print-meta-table td,
          .invoice-print-detail-table th,
          .invoice-print-detail-table td {
            border: 1px solid #444;
            padding: 4px 6px;
            vertical-align: middle;
          }
          .invoice-print-meta-table th {
            background: #f3f4f6;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
