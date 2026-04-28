"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type CustomerRow = Tables<"customers">;
type CustomerInsert = TablesInsert<"customers">;
type CustomerUpdate = TablesUpdate<"customers">;
type RegionRow = Tables<"regions">;
type RegionInsert = TablesInsert<"regions">;

const customerFields = [
  "code",
  "name",
  "business_number",
  "ceo_name",
  "phone",
  "address",
  "region_name",
  "tax_type",
  "note",
  "submit",
] as const;

const initialForm: CustomerInsert = {
  code: "",
  name: "",
  business_number: "",
  ceo_name: "",
  phone: "",
  address: "",
  region_id: null,
  tax_type: "",
  note: "",
  is_active: true,
};

function getCustomerSaveErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "동일한 거래처코드가 이미 존재합니다. (회사별 코드 중복 또는 DB 제약 확인 필요)";
  }
  return error.message || "저장 중 오류가 발생했습니다.";
}

async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, code, name, business_number, ceo_name, phone, address, region_id, tax_type, note, is_active, updated_at")
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CustomerRow[];
}

async function fetchRegions() {
  const { data, error } = await supabase.from("regions").select("id, code, name").order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as RegionRow[];
}

export function CustomerManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerInsert>(initialForm);
  const [regionInput, setRegionInput] = useState("");
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });

  const regionById = useMemo(() => {
    const map = new Map<string, RegionRow>();
    for (const region of regions ?? []) {
      map.set(region.id, region);
    }
    return map;
  }, [regions]);

  const filteredRegions = useMemo(() => {
    const keyword = regionInput.trim().toLowerCase();
    if (!keyword) {
      return regions ?? [];
    }
    return (regions ?? []).filter((region) => region.code.toLowerCase().includes(keyword));
  }, [regionInput, regions]);

  const exactMatchedRegion = useMemo(() => {
    const keyword = regionInput.trim().toLowerCase();
    if (!keyword) {
      return null;
    }
    return (regions ?? []).find((region) => region.code.toLowerCase() === keyword) ?? null;
  }, [regionInput, regions]);
  const totalCustomers = customers?.length ?? 0;
  const activeCustomers = customers?.filter((customer) => customer.is_active).length ?? 0;

  const saveCustomerMutation = useMutation({
    mutationFn: async (payload: CustomerInsert) => {
      const trimmedRegionCode = regionInput.trim();
      let resolvedRegionId: string | null = null;

      if (trimmedRegionCode) {
        const { data: existingRegion, error: regionSearchError } = await supabase
          .from("regions")
          .select("id, code")
          .ilike("code", trimmedRegionCode)
          .maybeSingle();

        if (regionSearchError) {
          throw regionSearchError;
        }

        if (existingRegion?.id) {
          resolvedRegionId = existingRegion.id;
        } else {
          const newRegionPayload: RegionInsert = {
            code: trimmedRegionCode,
            name: trimmedRegionCode,
          };

          const { data: newRegion, error: regionInsertError } = await supabase
            .from("regions")
            .insert(newRegionPayload)
            .select("id")
            .single();

          if (regionInsertError) {
            throw regionInsertError;
          }

          resolvedRegionId = newRegion.id;
        }
      }

      if (editingId) {
        const updatePayload: CustomerUpdate = {
          code: payload.code,
          name: payload.name,
          business_number: payload.business_number,
          ceo_name: payload.ceo_name,
          phone: payload.phone,
          address: payload.address,
          region_id: resolvedRegionId,
          tax_type: payload.tax_type,
          note: payload.note,
          is_active: payload.is_active,
        };
        const { error: updateError } = await supabase.from("customers").update(updatePayload).eq("id", editingId);
        if (updateError) {
          throw updateError;
        }
        return;
      }

      const insertPayload: CustomerInsert = {
        ...payload,
        region_id: resolvedRegionId,
      };

      const { error: insertError } = await supabase.from("customers").insert(insertPayload);
      if (insertError) {
        throw insertError;
      }
    },
    onSuccess: async () => {
      toast.success("거래처 정보가 저장되었습니다.");
      setOpen(false);
      setEditingId(null);
      setForm(initialForm);
      setRegionInput("");
      setIsRegionMenuOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["regions"] });
    },
    onError: (error) => {
      toast.error(getCustomerSaveErrorMessage(error));
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", customerId);
      if (error) {
        // 연결된 판매/단가/정산 데이터가 있으면 FK로 삭제가 막히므로 미사용 처리로 전환
        if (error.code === "23503") {
          const { error: deactivateError } = await supabase
            .from("customers")
            .update({ is_active: false })
            .eq("id", customerId);
          if (deactivateError) {
            throw deactivateError;
          }
          return { mode: "deactivated" as const };
        }
        throw error;
      }
      return { mode: "deleted" as const };
    },
    onSuccess: async (result) => {
      if (result?.mode === "deactivated") {
        toast.success("연결된 데이터가 있어 삭제 대신 미사용 처리했습니다.");
      } else {
        toast.success("거래처가 삭제되었습니다.");
      }
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["prices", "editor"] });
    },
    onError: (error) => {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.");
    },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(initialForm);
    setRegionInput("");
    setIsRegionMenuOpen(false);
    setOpen(true);
  };

  const openEditDialog = (customer: CustomerRow) => {
    setEditingId(customer.id);
    setForm({
      code: customer.code,
      name: customer.name,
      business_number: customer.business_number ?? "",
      ceo_name: customer.ceo_name ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      region_id: customer.region_id,
      tax_type: customer.tax_type ?? "",
      note: customer.note ?? "",
      is_active: customer.is_active ?? true,
    });
    const currentRegionCode = customer.region_id ? (regionById.get(customer.region_id)?.code ?? "") : "";
    setRegionInput(currentRegionCode);
    setIsRegionMenuOpen(false);
    setOpen(true);
  };

  const handleEnter = (event: React.KeyboardEvent<HTMLElement>, key: (typeof customerFields)[number]) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const index = customerFields.indexOf(key);
    const nextKey = customerFields[index + 1];

    if (!nextKey) {
      return;
    }

    if (nextKey === "submit") {
      saveCustomerMutation.mutate(form);
      return;
    }

    refs.current[nextKey]?.focus();
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">거래처 관리</h2>
          <p className="text-sm text-slate-600">거래처 기본 정보를 등록하고 관리합니다.</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            총 거래처 수: {totalCustomers.toLocaleString()} (사용: {activeCustomers.toLocaleString()})
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setEditingId(null);
              setRegionInput("");
              setIsRegionMenuOpen(false);
            }
          }}
        >
          <Button onClick={openCreateDialog}>신규 거래처 등록</Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "거래처 정보 수정" : "신규 거래처 등록"}</DialogTitle>
              <DialogDescription>필수 정보를 입력하고 저장하세요.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="customer-code">거래처 코드</Label>
                <Input
                  id="customer-code"
                  value={form.code ?? ""}
                  ref={(el) => {
                    refs.current.code = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "code")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-name">거래처명</Label>
                <Input
                  id="customer-name"
                  value={form.name ?? ""}
                  ref={(el) => {
                    refs.current.name = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "name")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-ceo">대표자</Label>
                <Input
                  id="customer-ceo"
                  value={form.ceo_name ?? ""}
                  ref={(el) => {
                    refs.current.ceo_name = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, ceo_name: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "ceo_name")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-business-number">사업자등록번호</Label>
                <Input
                  id="customer-business-number"
                  value={form.business_number ?? ""}
                  ref={(el) => {
                    refs.current.business_number = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, business_number: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "business_number")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-phone">전화번호</Label>
                <Input
                  id="customer-phone"
                  value={form.phone ?? ""}
                  ref={(el) => {
                    refs.current.phone = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "phone")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-address">실제 주소 (상세주소)</Label>
                <Input
                  id="customer-address"
                  value={form.address ?? ""}
                  ref={(el) => {
                    refs.current.address = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "address")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-region">지역 코드 (배송 구역)</Label>
                <div className="relative">
                  <Input
                    id="customer-region"
                    value={regionInput}
                    placeholder="지역코드 입력 또는 목록에서 선택"
                    ref={(el) => {
                      refs.current.region_name = el;
                    }}
                    onFocus={() => setIsRegionMenuOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsRegionMenuOpen(false), 150);
                    }}
                    onChange={(e) => {
                      setRegionInput(e.target.value);
                      setIsRegionMenuOpen(true);
                    }}
                    onKeyDown={(e) => handleEnter(e, "region_name")}
                  />

                  {isRegionMenuOpen && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-md">
                      {filteredRegions.map((region) => (
                        <button
                          key={region.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setRegionInput(region.code);
                            setIsRegionMenuOpen(false);
                          }}
                        >
                          {region.code}
                        </button>
                      ))}
                      {regionInput.trim() && !exactMatchedRegion && (
                        <button
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setRegionInput(regionInput.trim());
                            setIsRegionMenuOpen(false);
                          }}
                        >
                          신규 지역코드 [{regionInput.trim()}] 추가하기
                        </button>
                      )}
                      {filteredRegions.length === 0 && (!regionInput.trim() || !!exactMatchedRegion) && (
                        <p className="px-2 py-1.5 text-sm text-slate-500">일치하는 지역코드가 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-tax">과세구분</Label>
                <Input
                  id="customer-tax"
                  value={form.tax_type ?? ""}
                  ref={(el) => {
                    refs.current.tax_type = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, tax_type: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "tax_type")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-note">비고</Label>
                <Input
                  id="customer-note"
                  value={form.note ?? ""}
                  ref={(el) => {
                    refs.current.note = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "note")}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="customer-active">사용 여부</Label>
                <Switch
                  id="customer-active"
                  checked={!!form.is_active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
              <Button
                ref={(el) => {
                  refs.current.submit = el;
                }}
                onClick={() => saveCustomerMutation.mutate(form)}
                onKeyDown={(e) => handleEnter(e, "submit")}
                disabled={saveCustomerMutation.isPending || !form.code || !form.name}
              >
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>코드</TableHead>
            <TableHead>거래처명</TableHead>
            <TableHead>사업자번호</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead>주소</TableHead>
            <TableHead>지역코드</TableHead>
            <TableHead>과세구분</TableHead>
            <TableHead>비고</TableHead>
            <TableHead>사용여부</TableHead>
            <TableHead className="w-24">수정</TableHead>
            <TableHead className="w-24">삭제</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={12} className="py-8 text-center text-slate-500">
                데이터를 불러오는 중입니다...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && (customers?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="py-8 text-center text-slate-500">
                등록된 거래처가 없습니다.
              </TableCell>
            </TableRow>
          )}
          {customers?.map((customer) => (
            <TableRow
              key={customer.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => openEditDialog(customer)}
            >
              <TableCell>{customer.code}</TableCell>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.business_number ?? "-"}</TableCell>
              <TableCell>{customer.ceo_name ?? "-"}</TableCell>
              <TableCell>{customer.phone ?? "-"}</TableCell>
              <TableCell>{customer.address ?? "-"}</TableCell>
              <TableCell>{customer.region_id ? (regionById.get(customer.region_id)?.code ?? "-") : "-"}</TableCell>
              <TableCell>{customer.tax_type ?? "-"}</TableCell>
              <TableCell>{customer.note ?? "-"}</TableCell>
              <TableCell>{customer.is_active ? "사용" : "미사용"}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(customer)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const ok = window.confirm(
                      `[${customer.code}] ${customer.name} 거래처를 삭제하시겠습니까?\n관련 판매/단가 데이터가 있으면 삭제가 거부됩니다.`,
                    );
                    if (!ok || deleteCustomerMutation.isPending) {
                      return;
                    }
                    deleteCustomerMutation.mutate(customer.id);
                  }}
                  disabled={deleteCustomerMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
