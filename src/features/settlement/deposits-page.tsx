"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type CustomerRow = Tables<"customers">;
type DepositInsert = TablesInsert<"deposits">;
type DepositUpdate = TablesUpdate<"deposits">;
type DepositListRow = Pick<
  Tables<"deposits">,
  "id" | "customer_id" | "deposit_date" | "amount" | "payment_method" | "note" | "created_at"
>;
const paymentMethods = ["현금", "통장", "카드", "수표", "어음"] as const;

type DraftRow = {
  amountText: string;
  paymentMethod: (typeof paymentMethods)[number];
  note: string;
};
const EMPTY_CUSTOMERS: CustomerRow[] = [];

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
    .select("id, code, name, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as CustomerRow[];
}

async function fetchSalesUntil(toDate: string) {
  const { data, error } = await supabase
    .from("sales_daily")
    .select("customer_id, total_amount")
    .lte("supply_date", toDate);
  if (error) {
    throw error;
  }
  return (data ?? []) as Array<Pick<Tables<"sales_daily">, "customer_id" | "total_amount">>;
}

async function fetchDepositsUntil(toDate: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("customer_id, amount")
    .lte("deposit_date", toDate);
  if (error) {
    throw error;
  }
  return (data ?? []) as Array<Pick<Tables<"deposits">, "customer_id" | "amount">>;
}

async function fetchDepositsInRange(fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from("deposits")
    .select("id, customer_id, deposit_date, amount, payment_method, note, created_at")
    .gte("deposit_date", fromDate)
    .lte("deposit_date", toDate)
    .order("deposit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as DepositListRow[];
}

export function DepositsPage() {
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
  const [draftByCustomerId, setDraftByCustomerId] = useState<Record<string, DraftRow>>({});
  const amountInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: customers = EMPTY_CUSTOMERS } = useQuery({
    queryKey: ["customers", "deposits-bulk"],
    queryFn: fetchCustomers,
  });

  const appliedFrom = (rangeApplied.from ?? todayDate).toISOString().slice(0, 10);
  const appliedTo = (rangeApplied.to ?? rangeApplied.from ?? todayDate).toISOString().slice(0, 10);

  const { data: salesRows = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["deposits-bulk", "sales-until", appliedTo],
    queryFn: () => fetchSalesUntil(appliedTo),
  });
  const { data: depositRows = [], isLoading: isDepositsLoading } = useQuery({
    queryKey: ["deposits-bulk", "deposits-until", appliedTo],
    queryFn: () => fetchDepositsUntil(appliedTo),
  });

  const { data: registeredDeposits = [], isLoading: isRegisteredListLoading } = useQuery({
    queryKey: ["deposits", "list", appliedFrom, appliedTo],
    queryFn: () => fetchDepositsInRange(appliedFrom, appliedTo),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const [editAmountText, setEditAmountText] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<(typeof paymentMethods)[number]>("통장");
  const [editNote, setEditNote] = useState("");
  const [editDepositDate, setEditDepositDate] = useState("");

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  const customerById = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    for (const c of customers) {
      map.set(c.id, c);
    }
    return map;
  }, [customers]);

  const startEditDeposit = (row: DepositListRow) => {
    setEditingId(row.id);
    setEditAmountText(
      Number.isFinite(Number(row.amount)) ? String(Number(row.amount)) : "",
    );
    setEditPaymentMethod(
      paymentMethods.includes(row.payment_method as (typeof paymentMethods)[number])
        ? (row.payment_method as (typeof paymentMethods)[number])
        : "통장",
    );
    setEditNote(row.note ?? "");
    setEditDepositDate(row.deposit_date);
  };

  const cancelEditDeposit = () => {
    setEditingId(null);
    setEditAmountText("");
    setEditPaymentMethod("통장");
    setEditNote("");
    setEditDepositDate("");
  };

  const updateDepositMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: DepositUpdate }) => {
      const { error } = await supabase.from("deposits").update(payload).eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("입금 내역을 수정했습니다.");
      cancelEditDeposit();
      await queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "수정 중 오류가 발생했습니다.");
    },
  });

  const deleteDepositMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deposits").delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: async (_data, deletedId) => {
      toast.success("입금 내역을 삭제했습니다.");
      if (editingIdRef.current === deletedId) {
        cancelEditDeposit();
      }
      await queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    },
  });

  const saveEditedDeposit = (id: string) => {
    const amount = Number(editAmountText.replaceAll(",", ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("입금액은 0보다 큰 숫자여야 합니다.");
      return;
    }
    if (!editDepositDate) {
      toast.error("입금일을 선택해 주세요.");
      return;
    }
    const payload: DepositUpdate = {
      amount,
      payment_method: editPaymentMethod,
      note: editNote.trim() || null,
      deposit_date: editDepositDate,
    };
    updateDepositMutation.mutate({ id, payload });
  };

  useEffect(() => {
    setDraftByCustomerId((prev) => {
      const next: Record<string, DraftRow> = {};
      for (const customer of customers) {
        next[customer.id] = prev[customer.id] ?? {
          amountText: "",
          paymentMethod: "통장",
          note: "",
        };
      }
      return next;
    });
  }, [customers]);

  const outstandingByCustomerId = useMemo(() => {
    const salesByCustomer = new Map<string, number>();
    const depositsByCustomer = new Map<string, number>();

    for (const row of salesRows) {
      if (!row.customer_id) continue;
      salesByCustomer.set(row.customer_id, (salesByCustomer.get(row.customer_id) ?? 0) + Number(row.total_amount ?? 0));
    }
    for (const row of depositRows) {
      depositsByCustomer.set(row.customer_id, (depositsByCustomer.get(row.customer_id) ?? 0) + Number(row.amount ?? 0));
    }

    const map = new Map<string, number>();
    for (const customer of customers) {
      const outstanding = (salesByCustomer.get(customer.id) ?? 0) - (depositsByCustomer.get(customer.id) ?? 0);
      map.set(customer.id, outstanding);
    }
    return map;
  }, [customers, depositRows, salesRows]);

  const saveBulkMutation = useMutation({
    mutationFn: async (payload: DepositInsert[]) => {
      const { error } = await supabase.from("deposits").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("입금 내역을 일괄 저장했습니다.");
      setDraftByCustomerId((prev) => {
        const next = { ...prev };
        for (const customerId of Object.keys(next)) {
          next[customerId] = {
            ...next[customerId],
            amountText: "",
            note: "",
            paymentMethod: "통장",
          };
        }
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["deposits-bulk"] });
      await queryClient.invalidateQueries({ queryKey: ["deposits", "recent"] });
      await queryClient.invalidateQueries({ queryKey: ["balances-sales-until"] });
      await queryClient.invalidateQueries({ queryKey: ["balances-deposits-until"] });
    },
    onError: (error) => {
      toast.error(error.message || "일괄 저장 중 오류가 발생했습니다.");
    },
  });

  const customerOrder = useMemo(() => customers.map((customer) => customer.id), [customers]);

  const plannedTotalAmount = useMemo(() => {
    let sum = 0;
    for (const customerId of customerOrder) {
      const amount = Number((draftByCustomerId[customerId]?.amountText ?? "").replaceAll(",", ""));
      if (Number.isFinite(amount) && amount > 0) {
        sum += amount;
      }
    }
    return sum;
  }, [customerOrder, draftByCustomerId]);

  const submitBulk = () => {
    const payload: DepositInsert[] = [];
    for (const customerId of customerOrder) {
      const draft = draftByCustomerId[customerId];
      if (!draft) continue;
      const amount = Number(draft.amountText.replaceAll(",", ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }
      payload.push({
        customer_id: customerId,
        deposit_date: appliedTo,
        amount,
        payment_method: draft.paymentMethod,
        note: draft.note.trim() || null,
      });
    }
    if (payload.length === 0) {
      toast.error("입금액이 0원보다 큰 항목을 입력해 주세요.");
      return;
    }
    saveBulkMutation.mutate(payload);
  };

  const applyRange = () => {
    setRangeApplied({
      from: rangeInput.from ?? todayDate,
      to: rangeInput.to ?? rangeInput.from ?? todayDate,
    });
  };

  const onAmountEnter = (customerId: string) => {
    const index = customerOrder.indexOf(customerId);
    const nextCustomerId = customerOrder[index + 1];
    if (!nextCustomerId) return;
    amountInputRefs.current[nextCustomerId]?.focus();
    amountInputRefs.current[nextCustomerId]?.select();
  };

  const isLoading = isSalesLoading || isDepositsLoading;

  return (
    <section className="deposits-page space-y-4 rounded-lg border bg-white p-6">
      <div className="deposits-no-print flex items-center justify-between">
        <div>
        <h2 className="text-xl font-bold">입금 일괄 등록</h2>
        <p className="text-sm text-slate-600">여러 거래처의 입금 내역을 한 번에 입력하고 확정 저장합니다.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          PDF 저장
        </Button>
      </div>

      <div className="deposits-no-print flex flex-wrap items-end justify-between gap-3 rounded-md border p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-600">입금 기준 기간</p>
            <DateRangePicker value={rangeInput} onChange={(next) => next && setRangeInput(next)} className="w-[300px]" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-transparent">조회</p>
            <Button type="button" onClick={applyRange}>
              기간 반영
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">확정 입금일자</p>
          <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium">{appliedTo}</p>
        </div>
      </div>

      <div className="deposits-print-header hidden">
        <h1 className="text-2xl font-bold">입금등록 내역</h1>
        <p className="mt-1 text-sm">
          기준기간: {appliedFrom} ~ {appliedTo} / 확정 입금일자: {appliedTo}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">일자</TableHead>
              <TableHead>거래처명</TableHead>
              <TableHead className="text-right">미수잔액(참고)</TableHead>
              <TableHead className="w-[200px]">입금액</TableHead>
              <TableHead className="w-[150px]">결제방법</TableHead>
              <TableHead>적요</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  미수잔액 데이터를 불러오는 중입니다...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  활성 거래처가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              customers.map((customer) => {
                const draft = draftByCustomerId[customer.id] ?? { amountText: "", paymentMethod: "통장", note: "" };
                return (
                  <TableRow key={customer.id}>
                    <TableCell>{appliedTo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-slate-500">{customer.code}</div>
                    </TableCell>
                    <TableCell className="text-right">{(outstandingByCustomerId.get(customer.id) ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Input
                        className="deposits-edit-only"
                        ref={(element) => {
                          amountInputRefs.current[customer.id] = element;
                        }}
                        inputMode="numeric"
                        placeholder="0"
                        value={draft.amountText}
                        onChange={(event) =>
                          setDraftByCustomerId((prev) => ({
                            ...prev,
                            [customer.id]: {
                              ...draft,
                              amountText: event.target.value.replace(/[^\d]/g, ""),
                            },
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onAmountEnter(customer.id);
                          }
                        }}
                      />
                      <span className="deposits-print-only hidden">
                        {draft.amountText ? Number(draft.amountText).toLocaleString() : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <select
                        className="deposits-edit-only flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={draft.paymentMethod}
                        onChange={(event) =>
                          setDraftByCustomerId((prev) => ({
                            ...prev,
                            [customer.id]: {
                              ...draft,
                              paymentMethod: event.target.value as (typeof paymentMethods)[number],
                            },
                          }))
                        }
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                      <span className="deposits-print-only hidden">{draft.paymentMethod || ""}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="deposits-edit-only"
                        value={draft.note}
                        placeholder="적요 입력"
                        onChange={(event) =>
                          setDraftByCustomerId((prev) => ({
                            ...prev,
                            [customer.id]: {
                              ...draft,
                              note: event.target.value,
                            },
                          }))
                        }
                      />
                      <span className="deposits-print-only hidden">{draft.note.trim()}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            {!isLoading && customers.length > 0 && (
              <TableRow className="bg-slate-50">
                <TableCell />
                <TableCell className="font-semibold">총 입금 예정 합계</TableCell>
                <TableCell className="font-semibold text-right">{plannedTotalAmount.toLocaleString()}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="deposits-no-print flex justify-end">
        <Button type="button" onClick={submitBulk} disabled={saveBulkMutation.isPending}>
          입금 내역 확정 저장
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">기간 내 등록된 입금</h3>
        <p className="text-sm text-slate-600">
          {appliedFrom} ~ {appliedTo} 범위에서 저장된 입금 건을 수정하거나 삭제할 수 있습니다.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">입금일</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead className="text-right">입금액</TableHead>
                <TableHead className="min-w-[120px]">결제방법</TableHead>
                <TableHead>적요</TableHead>
                <TableHead className="deposits-registered-actions w-28">수정</TableHead>
                <TableHead className="deposits-registered-actions w-28">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isRegisteredListLoading) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    불러오는 중입니다…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isRegisteredListLoading && registeredDeposits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    이 기간에 등록된 입금이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !isRegisteredListLoading &&
                registeredDeposits.map((row) => {
                  const cust = customerById.get(row.customer_id);
                  const isEditing = editingId === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="deposits-edit-only h-9"
                            type="date"
                            value={editDepositDate}
                            onChange={(e) => setEditDepositDate(e.target.value)}
                          />
                        ) : (
                          row.deposit_date
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{cust?.name ?? "(삭제된 거래처)"}</div>
                        <div className="text-xs text-slate-500">{cust?.code ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            className="deposits-edit-only h-9 text-right"
                            inputMode="numeric"
                            value={editAmountText}
                            onChange={(e) => setEditAmountText(e.target.value.replace(/[^\d]/g, ""))}
                          />
                        ) : (
                          Number(row.amount).toLocaleString()
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            className="deposits-edit-only flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={editPaymentMethod}
                            onChange={(e) =>
                              setEditPaymentMethod(e.target.value as (typeof paymentMethods)[number])
                            }
                          >
                            {paymentMethods.map((method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            ))}
                          </select>
                        ) : (
                          row.payment_method
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="deposits-edit-only h-9"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="적요"
                          />
                        ) : (
                          row.note ?? "-"
                        )}
                      </TableCell>
                      <TableCell className="deposits-registered-actions">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              disabled={updateDepositMutation.isPending}
                              onClick={() => saveEditedDeposit(row.id)}
                            >
                              저장
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={cancelEditDeposit}>
                              취소
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!!editingId && editingId !== row.id}
                            onClick={() => startEditDeposit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="deposits-registered-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={deleteDepositMutation.isPending || isEditing}
                          onClick={() => {
                            const ok = window.confirm("이 입금 내역을 삭제할까요?");
                            if (!ok) return;
                            deleteDepositMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
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
          .deposits-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .deposits-no-print {
            display: none !important;
          }
          .deposits-print-header {
            display: block !important;
            margin-bottom: 12px;
          }
          .deposits-page table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
            line-height: 1.3;
          }
          .deposits-page th,
          .deposits-page td {
            border: 1px solid #444;
            padding: 4px 6px;
            vertical-align: middle;
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .deposits-page th {
            background: #f3f4f6 !important;
            font-weight: 600;
            text-align: center;
          }
          .deposits-page td.text-right {
            text-align: right !important;
            font-variant-numeric: tabular-nums;
          }
          .deposits-edit-only {
            display: none !important;
          }
          .deposits-print-only {
            display: inline !important;
            white-space: pre-wrap;
            line-height: 1.3;
          }
          .deposits-registered-actions {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
