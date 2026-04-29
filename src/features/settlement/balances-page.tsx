"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type CustomerRow = Tables<"customers">;
type SalesRow = Tables<"sales_daily">;
type DepositRow = Tables<"deposits">;
type SummaryRow = {
  customerId: string;
  customerName: string;
  carryOverAmount: number;
  periodSales: number;
  periodDeposits: number;
  currentOutstandingAmount: number;
};

function getDefaultRange(): DateRange {
  const today = new Date();
  return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
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

async function fetchSalesUntil(toDate: string) {
  const { data, error } = await supabase
    .from("sales_daily")
    .select("id, customer_id, supply_date, total_amount")
    .lte("supply_date", toDate);
  if (error) {
    throw error;
  }
  return (data ?? []) as SalesRow[];
}

async function fetchDepositsUntil(toDate: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("id, customer_id, deposit_date, amount")
    .lte("deposit_date", toDate);
  if (error) {
    throw error;
  }
  return (data ?? []) as DepositRow[];
}

export function BalancesPage() {
  const defaultRange = getDefaultRange();
  const [rangeInput, setRangeInput] = useState<DateRange>(defaultRange);
  const [rangeApplied, setRangeApplied] = useState<DateRange>(defaultRange);

  const today = new Date();
  const appliedFrom = (rangeApplied.from ?? today).toISOString().slice(0, 10);
  const appliedTo = (rangeApplied.to ?? rangeApplied.from ?? today).toISOString().slice(0, 10);

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", "balances-summary"],
    queryFn: fetchCustomers,
  });
  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["balances-sales-until", appliedTo],
    queryFn: () => fetchSalesUntil(appliedTo),
  });
  const { data: deposits = [], isLoading: isDepositsLoading } = useQuery({
    queryKey: ["balances-deposits-until", appliedTo],
    queryFn: () => fetchDepositsUntil(appliedTo),
  });

  const isLoading = isCustomersLoading || isSalesLoading || isDepositsLoading;

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const prevSalesByCustomer = new Map<string, number>();
    const prevDepositsByCustomer = new Map<string, number>();
    const periodSalesByCustomer = new Map<string, number>();
    const periodDepositsByCustomer = new Map<string, number>();

    for (const row of sales) {
      if (!row.customer_id) continue;
      const amount = Number(row.total_amount ?? 0);
      if (row.supply_date < appliedFrom) {
        prevSalesByCustomer.set(row.customer_id, (prevSalesByCustomer.get(row.customer_id) ?? 0) + amount);
      } else if (row.supply_date <= appliedTo) {
        periodSalesByCustomer.set(row.customer_id, (periodSalesByCustomer.get(row.customer_id) ?? 0) + amount);
      }
    }

    for (const row of deposits) {
      const amount = Number(row.amount ?? 0);
      if (row.deposit_date < appliedFrom) {
        prevDepositsByCustomer.set(row.customer_id, (prevDepositsByCustomer.get(row.customer_id) ?? 0) + amount);
      } else if (row.deposit_date <= appliedTo) {
        periodDepositsByCustomer.set(row.customer_id, (periodDepositsByCustomer.get(row.customer_id) ?? 0) + amount);
      }
    }

    return customers
      .map((customer) => {
        const carryOverAmount = (prevSalesByCustomer.get(customer.id) ?? 0) - (prevDepositsByCustomer.get(customer.id) ?? 0);
        const periodSales = periodSalesByCustomer.get(customer.id) ?? 0;
        const periodDeposits = periodDepositsByCustomer.get(customer.id) ?? 0;
        const currentOutstandingAmount = carryOverAmount + periodSales - periodDeposits;

        return {
          customerId: customer.id,
          customerName: customer.name,
          carryOverAmount,
          periodSales,
          periodDeposits,
          currentOutstandingAmount,
        };
      })
      .filter((row) => row.carryOverAmount !== 0 || row.periodSales !== 0 || row.periodDeposits !== 0 || row.currentOutstandingAmount !== 0)
      .sort((a, b) => a.customerName.localeCompare(b.customerName, "ko"));
  }, [appliedFrom, appliedTo, customers, deposits, sales]);

  const applyRange = () => {
    setRangeApplied({
      from: rangeInput.from ?? today,
      to: rangeInput.to ?? rangeInput.from ?? today,
    });
  };

  return (
    <section className="balances-ledger-page space-y-4 rounded-lg border bg-white p-6">
      <div className="balances-ledger-no-print flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">거래처별 외상잔액 명세</h2>
          <p className="text-sm text-slate-600">전월 이월잔액, 기간 매출/수금, 현재 미수잔액을 거래처별로 확인합니다.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          PDF 저장
        </Button>
      </div>

      <div className="balances-ledger-no-print flex flex-wrap items-end gap-3 rounded-md border p-3">
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

      <div className="balances-ledger-print-header hidden">
        <h1 className="text-2xl font-bold">거래처별 외상잔액 명세</h1>
        <p className="mt-1 text-sm">조회기간: {appliedFrom} ~ {appliedTo}</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">일자</TableHead>
              <TableHead>거래처명</TableHead>
              <TableHead className="text-right">전월 이월잔액</TableHead>
              <TableHead className="text-right">기간 매출액</TableHead>
              <TableHead className="text-right">기간 수금액</TableHead>
              <TableHead className="text-right">현재 미수잔액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  데이터를 불러오는 중입니다...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && summaryRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  집계할 데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              summaryRows.map((row) => (
                <TableRow key={row.customerId}>
                  <TableCell>{appliedTo}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell className="text-right">{row.carryOverAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.periodSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.periodDeposits.toLocaleString()}</TableCell>
                  <TableCell
                    className={row.currentOutstandingAmount > 0 ? "text-right font-semibold text-red-600" : "text-right font-semibold"}
                  >
                    {row.currentOutstandingAmount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          aside {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .balances-ledger-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .balances-ledger-no-print {
            display: none !important;
          }
          .balances-ledger-print-header {
            display: block !important;
            margin-bottom: 12px;
          }
          .balances-ledger-page table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
            line-height: 1.3;
          }
          .balances-ledger-page th,
          .balances-ledger-page td {
            border: 1px solid #444;
            padding: 4px 6px;
            vertical-align: middle;
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .balances-ledger-page th {
            background: #f3f4f6 !important;
            font-weight: 600;
            text-align: center;
          }
          .balances-ledger-page td.text-right {
            text-align: right !important;
            font-variant-numeric: tabular-nums;
          }
        }
      `}</style>
    </section>
  );
}
