"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type SalesRow = Tables<"sales_daily">;
type CustomerRow = Tables<"customers">;
type ProductRow = Tables<"products">;
type RegionRow = Tables<"regions">;
type DriverRow = Tables<"delivery_drivers">;

type DeliveryPrintRow = {
  id: string;
  regionName: string;
  regionCode: string;
  customerName: string;
  productName: string;
  quantity: number;
  remark: string;
};
type EnrichedRow = SalesRow & {
  customerName: string;
  productName: string;
  regionName: string;
  regionCode: string;
  included: boolean;
};
const EMPTY_ROWS: SalesRow[] = [];

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

async function fetchSales(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("sales_daily")
    .select("id, customer_id, product_id, quantity, remark, supply_date, delivery_status")
    .gte("supply_date", startDate)
    .lte("supply_date", endDate)
    .order("supply_date", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as SalesRow[];
}

async function fetchCustomers() {
  const { data, error } = await supabase.from("customers").select("id, name, region_id");
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("id, name");
  if (error) {
    throw error;
  }
  return (data ?? []) as ProductRow[];
}

async function fetchRegions() {
  const { data, error } = await supabase.from("regions").select("id, code, name");
  if (error) {
    throw error;
  }
  return (data ?? []) as RegionRow[];
}

async function fetchDrivers() {
  const { data, error } = await supabase
    .from("delivery_drivers")
    .select("id, name, vehicle_number, region_groups, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as DriverRow[];
}

export function DeliverySheetPage() {
  const queryClient = useQueryClient();
  const [startDateInput, setStartDateInput] = useState(getMonthStart());
  const [endDateInput, setEndDateInput] = useState(getToday());
  const [appliedStartDate, setAppliedStartDate] = useState(getMonthStart());
  const [appliedEndDate, setAppliedEndDate] = useState(getToday());
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [appliedDriverId, setAppliedDriverId] = useState<string>("");
  const [excludedMap, setExcludedMap] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ["delivery-sheet-sales", appliedStartDate, appliedEndDate],
    queryFn: () => fetchSales(appliedStartDate, appliedEndDate),
  });
  const sales = salesData ?? EMPTY_ROWS;
  const { data: customers = [] } = useQuery({
    queryKey: ["delivery-sheet-customers"],
    queryFn: fetchCustomers,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["delivery-sheet-products"],
    queryFn: fetchProducts,
  });
  const { data: regions = [] } = useQuery({
    queryKey: ["delivery-sheet-regions"],
    queryFn: fetchRegions,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["delivery-sheet-drivers"],
    queryFn: fetchDrivers,
  });

  const customerById = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    for (const customer of customers) {
      map.set(customer.id, customer);
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

  const regionById = useMemo(() => {
    const map = new Map<string, RegionRow>();
    for (const region of regions) {
      map.set(region.id, region);
    }
    return map;
  }, [regions]);

  const enrichedRows = useMemo(() => {
    return sales.map((row) => {
      const customer = row.customer_id ? customerById.get(row.customer_id) : null;
      const product = row.product_id ? productById.get(row.product_id) : null;
      const region = customer?.region_id ? regionById.get(customer.region_id) : null;
      return {
        ...row,
        customerName: customer?.name ?? "-",
        productName: product?.name ?? "-",
        regionName: region?.name ?? "-",
        regionCode: region?.code ?? "",
        included: !excludedMap[row.id],
      };
    });
  }, [customerById, excludedMap, productById, regionById, sales]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === appliedDriverId) ?? null,
    [appliedDriverId, drivers],
  );

  const filteredRowsByDriver = useMemo<EnrichedRow[]>(() => {
    if (!selectedDriver) {
      return [];
    }

    const regionCodes = selectedDriver.region_groups ?? [];
    return enrichedRows.filter((row) => regionCodes.includes(row.regionCode));
  }, [enrichedRows, selectedDriver]);

  const onRows = useMemo(() => filteredRowsByDriver.filter((row) => row.included), [filteredRowsByDriver]);
  const offRows = useMemo(() => filteredRowsByDriver.filter((row) => !row.included), [filteredRowsByDriver]);

  const toggleIncluded = (salesId: string, checked: boolean) => {
    setExcludedMap((prev) => {
      if (checked) {
        if (!prev[salesId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[salesId];
        return next;
      }

      if (prev[salesId]) {
        return prev;
      }
      return {
        ...prev,
        [salesId]: true,
      };
    });
  };

  const printRows = useMemo(() => {
    return onRows
      .map((row) => ({
        id: row.id,
        regionName: row.regionName,
        regionCode: row.regionCode,
        customerName: row.customerName,
        productName: row.productName,
        quantity: row.quantity,
        remark: row.remark ?? "",
      }))
      .sort((a, b) => {
        if (a.regionName !== b.regionName) {
          return a.regionName.localeCompare(b.regionName, "ko");
        }
        return a.customerName.localeCompare(b.customerName, "ko");
      });
  }, [onRows]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (onRows.length === 0) {
        return;
      }
      const ids = onRows.map((row) => row.id);
      const { error } = await supabase.from("sales_daily").update({ delivery_status: "confirmed" }).in("id", ids);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-sheet-sales", appliedStartDate, appliedEndDate] });
      await queryClient.invalidateQueries({ queryKey: ["sales-daily"] });
      toast.success("배송 확정이 완료되었습니다.");
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "배송 확정 중 오류가 발생했습니다.");
    },
  });

  const applyDateFilter = () => {
    setAppliedStartDate(startDateInput);
    setAppliedEndDate(endDateInput);
    setAppliedDriverId(selectedDriverId);
    setExcludedMap({});
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6 delivery-sheet-page">
      <div className="delivery-sheet-no-print flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">배송지시서 출력</h2>
          <p className="text-sm text-slate-600">출고 포함 항목만 기사별 배송지시서로 인쇄합니다.</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            조회 건수: {filteredRowsByDriver.length.toLocaleString()} / 출고 포함: {onRows.length.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)} disabled={!selectedDriver || onRows.length === 0}>
            배송 확정
          </Button>
          <Button type="button" onClick={() => window.print()} disabled={!selectedDriver || printRows.length === 0}>
            배송지시서 인쇄
          </Button>
        </div>
      </div>

      <div className="delivery-sheet-no-print rounded-md border p-3">
        <div className="grid gap-3 lg:grid-cols-[180px_180px_1fr_auto]">
          <div className="space-y-1">
            <p className="text-xs text-slate-600">시작일</p>
            <Input type="date" value={startDateInput} onChange={(event) => setStartDateInput(event.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">종료일</p>
            <Input type="date" value={endDateInput} onChange={(event) => setEndDateInput(event.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">배송기사</p>
            <select
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={selectedDriverId}
              onChange={(event) => setSelectedDriverId(event.target.value)}
            >
              <option value="">기사 선택</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} ({driver.vehicle_number})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={applyDateFilter} disabled={!selectedDriverId}>
              조회
            </Button>
          </div>
        </div>
        {selectedDriver && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(selectedDriver.region_groups ?? []).map((code) => (
              <span key={code} className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs">
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="delivery-sheet-no-print rounded-md border p-4">
        <h3 className="mb-2 text-sm font-semibold text-emerald-700">출고 포함 (ON)</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일자</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>거래처</TableHead>
              <TableHead>품목</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-[90px]">출고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  데이터를 불러오는 중입니다...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !appliedDriverId && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  기사 선택 후 조회해 주세요.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && onRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  출고 포함 항목이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              onRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.supply_date}</TableCell>
                  <TableCell>{row.regionName}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{row.delivery_status === "confirmed" ? "배송 확정" : "대기"}</TableCell>
                  <TableCell>
                    <Switch checked={row.included} onCheckedChange={(checked) => toggleIncluded(row.id, checked)} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="delivery-sheet-no-print rounded-md border p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-500">출고 제외 (OFF)</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일자</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>거래처</TableHead>
              <TableHead>품목</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-[90px]">출고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && offRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  출고 제외 항목이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              offRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.supply_date}</TableCell>
                  <TableCell>{row.regionName}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{row.delivery_status === "confirmed" ? "배송 확정" : "대기"}</TableCell>
                  <TableCell>
                    <Switch checked={row.included} onCheckedChange={(checked) => toggleIncluded(row.id, checked)} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="delivery-sheet-print-only hidden">
        {selectedDriver && printRows.length > 0 && (
          <div className="print-sheet mb-8">
              <table className="print-excel-table print-header-table">
                <tbody>
                  <tr>
                    <th>배송기사</th>
                    <td colSpan={2}>
                      {selectedDriver.name} (서명)
                    </td>
                    <th>차량번호</th>
                    <td>{selectedDriver.vehicle_number}</td>
                    <th>배송종료</th>
                    <td>시&nbsp;&nbsp;분</td>
                  </tr>
                </tbody>
              </table>

              <table className="print-excel-table print-detail-table">
                <thead>
                  <tr>
                    <th>배송지역</th>
                    <th>거래처</th>
                    <th>품 목</th>
                    <th>수량</th>
                    <th>배송확인</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {printRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.regionName}</td>
                      <td>{row.customerName}</td>
                      <td>{row.productName}</td>
                      <td className="text-right">{row.quantity.toLocaleString()}</td>
                      <td></td>
                      <td>{row.remark}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="font-bold">
                      합계
                    </td>
                    <td className="font-bold text-right">
                      {printRows.reduce((sum, row) => sum + row.quantity, 0).toLocaleString()}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>배송 확정</AlertDialogTitle>
            <AlertDialogDescription>
              배송 확정을 진행하시겠습니까? 확정된 내역은 일일 판매 등록 페이지에서 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              확정
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        .print-excel-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .print-excel-table th,
        .print-excel-table td {
          border: 1px solid black;
          padding: 6px 8px;
          color: black;
          background: white;
        }

        .print-header-table {
          margin-bottom: 8px;
        }

        @media print {
          aside {
            display: none !important;
          }
          main {
            padding: 0 !important;
            width: 100% !important;
          }
          .delivery-sheet-page {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .delivery-sheet-no-print {
            display: none !important;
          }
          .delivery-sheet-print-only {
            display: block !important;
          }
          .print-sheet {
            page-break-after: always;
          }
          .print-sheet:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </section>
  );
}
