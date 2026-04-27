"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type CustomerRow = Tables<"customers">;
type SalesRow = Tables<"sales_daily">;
type DepositRow = Tables<"deposits">;
type LedgerEntry = {
  id: string;
  occurredAt: string;
  type: "매출" | "입금";
  amount: number;
  note: string;
};
type SummaryRow = {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalDeposits: number;
  outstandingAmount: number;
};

function getTodayRange(): DateRange {
  const today = new Date();
  return { from: today, to: today };
}

async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchSales(fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from("sales_daily")
    .select("id, customer_id, supply_date, total_amount, remark")
    .gte("supply_date", fromDate)
    .lte("supply_date", toDate);
  if (error) {
    throw error;
  }
  return (data ?? []) as SalesRow[];
}

async function fetchDeposits(fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("id, customer_id, deposit_date, amount, note")
    .gte("deposit_date", fromDate)
    .lte("deposit_date", toDate);
  if (error) {
    throw error;
  }
  return (data ?? []) as DepositRow[];
}

export function BalancesPage() {
  const todayRange = getTodayRange();
  const [rangeInput, setRangeInput] = useState<DateRange>(todayRange);
  const [rangeApplied, setRangeApplied] = useState<DateRange>(todayRange);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const today = new Date();
  const appliedFrom = (rangeApplied.from ?? today).toISOString().slice(0, 10);
  const appliedTo = (rangeApplied.to ?? rangeApplied.from ?? today).toISOString().slice(0, 10);

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", "balances-summary"],
    queryFn: fetchCustomers,
  });
  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["balances-sales", appliedFrom, appliedTo],
    queryFn: () => fetchSales(appliedFrom, appliedTo),
  });
  const { data: deposits = [], isLoading: isDepositsLoading } = useQuery({
    queryKey: ["balances-deposits", appliedFrom, appliedTo],
    queryFn: () => fetchDeposits(appliedFrom, appliedTo),
  });

  const isLoading = isCustomersLoading || isSalesLoading || isDepositsLoading;

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const salesByCustomer = new Map<string, number>();
    const depositsByCustomer = new Map<string, number>();

    for (const row of sales) {
      if (!row.customer_id) continue;
      salesByCustomer.set(row.customer_id, (salesByCustomer.get(row.customer_id) ?? 0) + Number(row.total_amount ?? 0));
    }
    for (const row of deposits) {
      depositsByCustomer.set(row.customer_id, (depositsByCustomer.get(row.customer_id) ?? 0) + Number(row.amount ?? 0));
    }

    return customers
      .map((customer) => {
        const totalSales = salesByCustomer.get(customer.id) ?? 0;
        const totalDeposits = depositsByCustomer.get(customer.id) ?? 0;
        return {
          customerId: customer.id,
          customerName: customer.name,
          totalSales,
          totalDeposits,
          outstandingAmount: totalSales - totalDeposits,
        };
      })
      .filter((row) => row.totalSales !== 0 || row.totalDeposits !== 0)
      .sort((a, b) => a.customerName.localeCompare(b.customerName, "ko"));
  }, [customers, deposits, sales]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const ledgerEntries = useMemo<LedgerEntry[]>(() => {
    if (!selectedCustomerId) {
      return [];
    }
    const salesEntries: LedgerEntry[] = sales
      .filter((row) => row.customer_id === selectedCustomerId)
      .map((row) => ({
        id: `sales-${row.id}`,
        occurredAt: row.supply_date,
        type: "매출",
        amount: Number(row.total_amount ?? 0),
        note: row.remark ?? "",
      }));
    const depositEntries: LedgerEntry[] = deposits
      .filter((row) => row.customer_id === selectedCustomerId)
      .map((row) => ({
        id: `deposit-${row.id}`,
        occurredAt: row.deposit_date,
        type: "입금",
        amount: Number(row.amount ?? 0),
        note: row.note ?? "",
      }));

    return [...salesEntries, ...depositEntries].sort((a, b) => {
      if (a.occurredAt !== b.occurredAt) {
        return a.occurredAt.localeCompare(b.occurredAt);
      }
      return a.id.localeCompare(b.id);
    });
  }, [deposits, sales, selectedCustomerId]);

  const applyRange = () => {
    setRangeApplied({
      from: rangeInput.from ?? today,
      to: rangeInput.to ?? rangeInput.from ?? today,
    });
  };

  const handleOpenDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setDetailOpen(true);
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div>
        <h2 className="text-xl font-bold">미수금 현황</h2>
        <p className="text-sm text-slate-600">거래처별 요약을 보고, 행 클릭 시 거래처 원장(매출/입금)을 확인합니다.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="space-y-1">
          <p className="text-xs text-slate-600">조회 기간</p>
          <DateRangePicker value={rangeInput} onChange={(next) => next && setRangeInput(next)} className="w-[300px]" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-transparent">조회</p>
          <Button type="button" onClick={applyRange}>
            기간 조회
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래처명</TableHead>
              <TableHead className="text-right">총 매출액</TableHead>
              <TableHead className="text-right">총 수금액</TableHead>
              <TableHead className="text-right">미수 잔액</TableHead>
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
            {!isLoading && summaryRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                  집계할 데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              summaryRows.map((row) => (
                <TableRow
                  key={row.customerId}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleOpenDetail(row.customerId)}
                >
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell className="text-right">{row.totalSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.totalDeposits.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {row.outstandingAmount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              거래처 원장 - {selectedCustomer?.name ?? "-"} ({appliedFrom} ~ {appliedTo})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일자</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                      선택한 기간의 상세 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {ledgerEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.occurredAt}</TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell className="text-right">{entry.amount.toLocaleString()}</TableCell>
                    <TableCell>{entry.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>닫기</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
