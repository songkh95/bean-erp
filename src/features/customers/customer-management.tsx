"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
import type { Tables, TablesInsert } from "@/types/database.types";

type CustomerRow = Tables<"customers">;
type CustomerInsert = TablesInsert<"customers">;

const customerFields = ["code", "name", "ceo_name", "phone", "region_id", "tax_type", "submit"] as const;

const initialForm: CustomerInsert = {
  code: "",
  name: "",
  ceo_name: "",
  phone: "",
  region_id: null,
  tax_type: "",
  is_active: true,
};

async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, code, name, ceo_name, phone, region_id, tax_type, is_active, updated_at")
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CustomerRow[];
}

export function CustomerManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerInsert>(initialForm);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: CustomerInsert) => {
      const { error } = await supabase.from("customers").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast("저장되었습니다");
      setOpen(false);
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      toast.error(error.message || "저장 중 오류가 발생했습니다.");
    },
  });

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
      createCustomerMutation.mutate(form);
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
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>신규 거래처 등록</Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>신규 거래처 등록</DialogTitle>
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
                <Label htmlFor="customer-region">지역</Label>
                <Input
                  id="customer-region"
                  value={form.region_id ?? ""}
                  ref={(el) => {
                    refs.current.region_id = el;
                  }}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      region_id: e.target.value.trim() ? e.target.value : null,
                    }))
                  }
                  onKeyDown={(e) => handleEnter(e, "region_id")}
                />
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
                onClick={() => createCustomerMutation.mutate(form)}
                onKeyDown={(e) => handleEnter(e, "submit")}
                disabled={createCustomerMutation.isPending || !form.code || !form.name}
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
            <TableHead>대표자</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead>지역</TableHead>
            <TableHead>과세구분</TableHead>
            <TableHead>사용여부</TableHead>
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
          {!isLoading && (customers?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                등록된 거래처가 없습니다.
              </TableCell>
            </TableRow>
          )}
          {customers?.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.code}</TableCell>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.ceo_name ?? "-"}</TableCell>
              <TableCell>{customer.phone ?? "-"}</TableCell>
              <TableCell>{customer.region_id ?? "-"}</TableCell>
              <TableCell>{customer.tax_type ?? "-"}</TableCell>
              <TableCell>{customer.is_active ? "사용" : "미사용"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
