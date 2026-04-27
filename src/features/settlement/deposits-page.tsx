"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

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
import { handleEnterToNextField } from "@/lib/keyboard/enter-to-next-field";
import { supabase } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/types/database.types";

import { ComboboxInput } from "../sales/combobox-input";

type CustomerRow = Tables<"customers">;
type DepositRow = Tables<"deposits">;
type DepositInsert = TablesInsert<"deposits">;

const fieldOrder = ["deposit-date", "deposit-customer", "deposit-amount", "deposit-method", "deposit-note"] as const;

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, code, name")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchDeposits(fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("id, customer_id, deposit_date, amount, payment_method, note, created_at")
    .gte("deposit_date", fromDate)
    .lte("deposit_date", toDate)
    .order("deposit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as DepositRow[];
}

export function DepositsPage() {
  const queryClient = useQueryClient();
  const today = getToday();
  const todayDate = new Date(today);

  const [entryDepositDate, setEntryDepositDate] = useState(today);
  const [rangeInput, setRangeInput] = useState<DateRange>({
    from: todayDate,
    to: todayDate,
  });
  const [rangeApplied, setRangeApplied] = useState<DateRange>({
    from: todayDate,
    to: todayDate,
  });
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("통장");
  const [note, setNote] = useState("");
  const [editingRow, setEditingRow] = useState<DepositRow | null>(null);
  const [editDepositDate, setEditDepositDate] = useState("");
  const [editAmountInput, setEditAmountInput] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "deposits-form"],
    queryFn: fetchCustomers,
  });

  const appliedFrom = (rangeApplied.from ?? todayDate).toISOString().slice(0, 10);
  const appliedTo = (rangeApplied.to ?? rangeApplied.from ?? todayDate).toISOString().slice(0, 10);

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["deposits", "recent", appliedFrom, appliedTo],
    queryFn: () => fetchDeposits(appliedFrom, appliedTo),
  });

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const keyword = customerKeyword.trim().toLowerCase();
    if (!keyword) {
      return customers;
    }
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(keyword) ||
        customer.code.toLowerCase().includes(keyword),
    );
  }, [customerKeyword, customers]);

  const saveDepositMutation = useMutation({
    mutationFn: async (payload: DepositInsert) => {
      const { error } = await supabase.from("deposits").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast("저장되었습니다");
      setAmountInput("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["deposits", "recent"] });
      await queryClient.invalidateQueries({ queryKey: ["customer-balances"] });
    },
    onError: (error) => {
      toast.error(error.message || "저장 중 오류가 발생했습니다.");
    },
  });

  const updateDepositMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) {
        return;
      }

      const parsedAmount = Number(editAmountInput.replaceAll(",", ""));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("입금액을 올바르게 입력해 주세요.");
      }

      const { error } = await supabase
        .from("deposits")
        .update({
          deposit_date: editDepositDate,
          amount: parsedAmount,
          payment_method: editPaymentMethod.trim() || "통장",
          note: editNote.trim() || null,
        })
        .eq("id", editingRow.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("수정되었습니다.");
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: ["deposits", "recent"] });
      await queryClient.invalidateQueries({ queryKey: ["customer-balances"] });
    },
    onError: (error) => {
      toast.error(error.message || "수정 중 오류가 발생했습니다.");
    },
  });

  const deleteDepositMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const { error } = await supabase.from("deposits").delete().eq("id", depositId);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["deposits", "recent"] });
      await queryClient.invalidateQueries({ queryKey: ["customer-balances"] });
    },
    onError: (error) => {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.");
    },
  });

  const submit = () => {
    const parsedAmount = Number(amountInput.replaceAll(",", ""));
    if (!selectedCustomerId) {
      toast.error("거래처를 선택해 주세요.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("입금액을 올바르게 입력해 주세요.");
      return;
    }

    const payload: DepositInsert = {
      customer_id: selectedCustomerId,
      deposit_date: entryDepositDate,
      amount: parsedAmount,
      payment_method: paymentMethod.trim() || "통장",
      note: note.trim() || null,
    };

    saveDepositMutation.mutate(payload);
  };

  const applyRange = () => {
    setRangeApplied({
      from: rangeInput.from ?? todayDate,
      to: rangeInput.to ?? rangeInput.from ?? todayDate,
    });
  };

  const openEditDialog = (row: DepositRow) => {
    setEditingRow(row);
    setEditDepositDate(row.deposit_date);
    setEditAmountInput(String(row.amount));
    setEditPaymentMethod(row.payment_method);
    setEditNote(row.note ?? "");
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div>
        <h2 className="text-xl font-bold">입금 등록</h2>
        <p className="text-sm text-slate-600">수기 입금 내역을 등록하면 미수금 계산에 즉시 반영됩니다.</p>
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

      <div className="rounded-md border p-3">
        <div className="grid gap-3 lg:grid-cols-[150px_1fr_170px_150px_1fr_auto]">
          <div className="space-y-1">
            <p className="text-xs text-slate-600">입금일자</p>
            <Input
              id="deposit-date"
              type="date"
              value={entryDepositDate}
              onChange={(event) => setEntryDepositDate(event.target.value)}
              onKeyDown={(event) => handleEnterToNextField(event, [...fieldOrder], submit)}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600">거래처</p>
            <ComboboxInput
              id="deposit-customer"
              value={customerKeyword}
              placeholder="거래처명 또는 코드 검색"
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
                const found = customers.find((customer) => customer.name === next || customer.code === next);
                setSelectedCustomerId(found?.id ?? null);
              }}
              onSelect={(option) => {
                setSelectedCustomerId(option.id);
                setCustomerKeyword(option.label);
              }}
              onKeyDown={(event) => {
                handleEnterToNextField(event, [...fieldOrder], submit);
              }}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600">입금액</p>
            <Input
              id="deposit-amount"
              inputMode="numeric"
              value={amountInput}
              placeholder="예: 500000"
              onChange={(event) => setAmountInput(event.target.value)}
              onKeyDown={(event) => handleEnterToNextField(event, [...fieldOrder], submit)}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600">결제수단</p>
            <Input
              id="deposit-method"
              value={paymentMethod}
              placeholder="현금/통장"
              onChange={(event) => setPaymentMethod(event.target.value)}
              onKeyDown={(event) => handleEnterToNextField(event, [...fieldOrder], submit)}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600">적요</p>
            <Input
              id="deposit-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => handleEnterToNextField(event, [...fieldOrder], submit)}
            />
          </div>

          <div className="flex items-end">
            <Button type="button" onClick={submit} disabled={saveDepositMutation.isPending}>
              저장
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="border-b px-4 py-3 text-sm font-semibold">입금 내역 ({appliedFrom} ~ {appliedTo})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>입금일자</TableHead>
              <TableHead>거래처명</TableHead>
              <TableHead className="text-right">입금액</TableHead>
              <TableHead>결제수단</TableHead>
              <TableHead>적요</TableHead>
              <TableHead className="w-[96px]">수정</TableHead>
              <TableHead className="w-[96px]">삭제</TableHead>
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
            {!isLoading && deposits.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  등록된 입금 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              deposits.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.deposit_date}</TableCell>
                  <TableCell>{customerNameById.get(row.customer_id) ?? "-"}</TableCell>
                  <TableCell className="text-right">{Number(row.amount).toLocaleString()}</TableCell>
                  <TableCell>{row.payment_method}</TableCell>
                  <TableCell>{row.note ?? "-"}</TableCell>
                  <TableCell>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(row)}>
                      수정
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const ok = window.confirm("선택한 입금 내역을 삭제하시겠습니까?");
                        if (!ok || deleteDepositMutation.isPending) {
                          return;
                        }
                        deleteDepositMutation.mutate(row.id);
                      }}
                      disabled={deleteDepositMutation.isPending}
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>입금 내역 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">입금일자</p>
              <Input type="date" value={editDepositDate} onChange={(event) => setEditDepositDate(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">입금액</p>
              <Input
                inputMode="numeric"
                value={editAmountInput}
                onChange={(event) => setEditAmountInput(event.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">결제수단</p>
              <Input value={editPaymentMethod} onChange={(event) => setEditPaymentMethod(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-slate-600">적요</p>
              <Input value={editNote} onChange={(event) => setEditNote(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button type="button" onClick={() => updateDepositMutation.mutate()} disabled={updateDepositMutation.isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
