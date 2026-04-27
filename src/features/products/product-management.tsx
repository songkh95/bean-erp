"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
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
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type ProductRow = Tables<"products">;
type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

const productFields = ["code", "name", "specification", "submit"] as const;

const initialForm: ProductInsert = {
  code: "",
  name: "",
  specification: "",
  is_active: true,
};

function getProductSaveErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "동일한 품목코드가 이미 존재합니다. (회사별 코드 중복 또는 DB 제약 확인 필요)";
  }
  return error.message || "저장 중 오류가 발생했습니다.";
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, specification, is_active, created_at")
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProductRow[];
}

export function ProductManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductInsert>(initialForm);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: ProductInsert) => {
      if (editingId) {
        const updatePayload: ProductUpdate = {
          code: payload.code,
          name: payload.name,
          specification: payload.specification,
          is_active: payload.is_active,
        };

        const { error } = await supabase.from("products").update(updatePayload).eq("id", editingId);
        if (error) {
          throw error;
        }
        return;
      }

      const { error } = await supabase.from("products").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast("저장되었습니다");
      setOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error(getProductSaveErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("품목이 삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["prices", "editor"] });
    },
    onError: (error) => {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.");
    },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEditDialog = (product: ProductRow) => {
    setEditingId(product.id);
    setForm({
      code: product.code,
      name: product.name,
      specification: product.specification ?? "",
      is_active: product.is_active ?? true,
    });
    setOpen(true);
  };

  const handleEnter = (event: React.KeyboardEvent<HTMLElement>, key: (typeof productFields)[number]) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const index = productFields.indexOf(key);
    const nextKey = productFields[index + 1];

    if (!nextKey) {
      return;
    }

    if (nextKey === "submit") {
      upsertMutation.mutate(form);
      return;
    }

    refs.current[nextKey]?.focus();
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">품목 관리</h2>
          <p className="text-sm text-slate-600">품목 기본 정보를 등록하고 수정합니다.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreateDialog}>신규 품목 등록</Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "품목 수정" : "신규 품목 등록"}</DialogTitle>
              <DialogDescription>Enter 키로 다음 칸 이동 후 빠르게 저장할 수 있습니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="product-code">품목코드</Label>
                <Input
                  id="product-code"
                  value={form.code ?? ""}
                  ref={(el) => {
                    refs.current.code = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "code")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-name">품목명</Label>
                <Input
                  id="product-name"
                  value={form.name ?? ""}
                  ref={(el) => {
                    refs.current.name = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "name")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-specification">규격</Label>
                <Input
                  id="product-specification"
                  value={form.specification ?? ""}
                  ref={(el) => {
                    refs.current.specification = el;
                  }}
                  onChange={(e) => setForm((prev) => ({ ...prev, specification: e.target.value }))}
                  onKeyDown={(e) => handleEnter(e, "specification")}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="product-active">사용 여부</Label>
                <Switch
                  id="product-active"
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
                onClick={() => upsertMutation.mutate(form)}
                onKeyDown={(e) => handleEnter(e, "submit")}
                disabled={upsertMutation.isPending || !form.code || !form.name}
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
            <TableHead>품목코드</TableHead>
            <TableHead>품목명</TableHead>
            <TableHead>규격</TableHead>
            <TableHead>사용여부</TableHead>
            <TableHead className="w-24">수정</TableHead>
            <TableHead className="w-24">삭제</TableHead>
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
          {!isLoading && (products?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                등록된 품목이 없습니다.
              </TableCell>
            </TableRow>
          )}
          {products?.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.code}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.specification ?? "-"}</TableCell>
              <TableCell>{product.is_active ? "사용" : "미사용"}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const ok = window.confirm(
                      `[${product.code}] ${product.name} 품목을 삭제하시겠습니까?\n관련 데이터가 있으면 삭제가 거부됩니다.`,
                    );
                    if (!ok || deleteMutation.isPending) {
                      return;
                    }
                    deleteMutation.mutate(product.id);
                  }}
                  disabled={deleteMutation.isPending}
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
