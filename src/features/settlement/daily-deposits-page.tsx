"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type DepositRow = Tables<"deposits">;
type CustomerRow = Tables<"customers">;

function getTodayRange(): DateRange {
  const now = new Date();
  return { from: now, to: now };
}

async function fetchCustomers() {
  const { data, error } = await supabase.from("customers").select("id, name").order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchDeposits(fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("id, customer_id, deposit_date, note, payment_method, amount")
    .gte("deposit_date", fromDate)
    .lte("deposit_date", toDate)
    .order("deposit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as DepositRow[];
}

export function DailyDepositsPage() {
  const todayRange = getTodayRange();
  const [rangeInput, setRangeInput] = useState<DateRange>(todayRange);
  const [rangeApplied, setRangeApplied] = useState<DateRange>(todayRange);

  const today = new Date();
  const appliedFrom = (rangeApplied.from ?? today).toISOString().slice(0, 10);
  const appliedTo = (rangeApplied.to ?? rangeApplied.from ?? today).toISOString().slice(0, 10);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "daily-deposits-report"],
    queryFn: fetchCustomers,
  });
  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["daily-deposits-report", appliedFrom, appliedTo],
    queryFn: () => fetchDeposits(appliedFrom, appliedTo),
  });

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customers]);

  const totalAmount = useMemo(() => deposits.reduce((sum, row) => sum + Number(row.amount), 0), [deposits]);

  const applyRange = () => {
    setRangeApplied({
      from: rangeInput.from ?? today,
      to: rangeInput.to ?? rangeInput.from ?? today,
    });
  };

  return (
    <section className="daily-deposits-page space-y-4 rounded-lg border bg-white p-6">
      <div className="daily-deposits-no-print flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">수금일보</h2>
          <p className="text-sm text-slate-600">선택한 기간의 입금 내역을 조회합니다.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          PDF 저장
        </Button>
      </div>

      <div className="daily-deposits-no-print flex flex-wrap items-end gap-3 rounded-md border p-3">
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

      <div className="daily-deposits-print-header hidden">
        <h1 className="text-2xl font-bold">수금일보</h1>
        <p className="mt-1 text-sm">조회기간: {appliedFrom} ~ {appliedTo}</p>
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          총 입금액 합계 ({appliedFrom} ~ {appliedTo})
        </p>
        <p className="mt-1 text-3xl font-bold text-emerald-700">{totalAmount.toLocaleString()}원</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>입금일자</TableHead>
              <TableHead>거래처명</TableHead>
              <TableHead>적요</TableHead>
              <TableHead>결제방법</TableHead>
              <TableHead className="text-right">입금액</TableHead>
              <TableHead>비고</TableHead>
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
            {!isLoading && deposits.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  조회된 입금 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              deposits.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.deposit_date}</TableCell>
                  <TableCell>{customerNameById.get(row.customer_id) ?? "-"}</TableCell>
                  <TableCell>{row.note ?? "-"}</TableCell>
                  <TableCell>{row.payment_method}</TableCell>
                  <TableCell className="text-right font-medium">{Number(row.amount).toLocaleString()}</TableCell>
                  <TableCell>-</TableCell>
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
          .daily-deposits-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .daily-deposits-no-print {
            display: none !important;
          }
          .daily-deposits-print-header {
            display: block !important;
            margin-bottom: 12px;
          }
          .daily-deposits-page table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
            line-height: 1.3;
          }
          .daily-deposits-page th,
          .daily-deposits-page td {
            border: 1px solid #444;
            padding: 4px 6px;
            vertical-align: middle;
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .daily-deposits-page th {
            background: #f3f4f6 !important;
            font-weight: 600;
            text-align: center;
          }
          .daily-deposits-page td.text-right {
            text-align: right !important;
            font-variant-numeric: tabular-nums;
          }
        }
      `}</style>
    </section>
  );
}
