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
import { fetchCurrentCompanyId } from "@/lib/current-company";
import { assertHeadersMatch, generateTemplate, parseExcel } from "@/lib/excel-utils";
import { supabase } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type ProductRow = Tables<"products">;
type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;

const PRODUCT_EXCEL_HEADERS = ["품목명", "규격", "단위", "기본단가", "카테고리", "비고"] as const;

function buildProductSpecification(row: Record<string, string>): string | null {
  const spec = row["규격"]?.trim();
  const metaParts: string[] = [];
  if (row["단위"]?.trim()) {
    metaParts.push(`단위: ${row["단위"].trim()}`);
  }
  if (row["기본단가"]?.trim()) {
    metaParts.push(`기본단가: ${row["기본단가"].trim()}`);
  }
  if (row["카테고리"]?.trim()) {
    metaParts.push(`카테고리: ${row["카테고리"].trim()}`);
  }
  if (row["비고"]?.trim()) {
    metaParts.push(`비고: ${row["비고"].trim()}`);
  }
  const lines: string[] = [];
  if (spec) {
    lines.push(spec);
  }
  if (metaParts.length > 0) {
    lines.push(metaParts.join(" | "));
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

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
  const [excelBusy, setExcelBusy] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  const totalProducts = products?.length ?? 0;
  const activeProducts = products?.filter((product) => product.is_active).length ?? 0;

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

  const handleDownloadProductTemplate = async () => {
    try {
      setExcelBusy(true);
      await generateTemplate({
        headers: [...PRODUCT_EXCEL_HEADERS],
        filename: "품목_등록_양식",
        sheetName: "품목",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "양식을 만드는 중 오류가 발생했습니다.");
    } finally {
      setExcelBusy(false);
    }
  };

  const handleProductExcelSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setExcelBusy(true);
    try {
      const { headers, rows } = await parseExcel(file);
      assertHeadersMatch(PRODUCT_EXCEL_HEADERS, headers);

      const companyId = await fetchCurrentCompanyId();
      if (!companyId) {
        toast.error("로그인 또는 회사(테넌트) 정보를 확인할 수 없습니다.");
        return;
      }

      const rowErrors: string[] = [];
      const payloads: ProductInsert[] = [];

      rows.forEach((row, idx) => {
        const line = idx + 2;
        const name = row["품목명"]?.trim();
        if (!name) {
          rowErrors.push(`${line}행: 품목명은 필수입니다.`);
          return;
        }
        const code = `P-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        payloads.push({
          code,
          company_id: companyId,
          name,
          specification: buildProductSpecification(row),
          is_active: true,
        });
      });

      if (payloads.length === 0) {
        toast.error(rowErrors.length ? rowErrors.slice(0, 8).join("\n") : "등록할 유효한 행이 없습니다.");
        return;
      }

      const chunkSize = 80;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from("products").insert(chunk);
        if (insertError) {
          throw new Error(insertError.message || "품목 일괄 등록에 실패했습니다.");
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });

      const okMsg = `성공적으로 ${payloads.length.toLocaleString()}건의 품목이 등록되었습니다.`;
      if (rowErrors.length) {
        toast.success(okMsg, {
          description: `일부 행은 건너뜀:\n${rowErrors.slice(0, 6).join("\n")}${rowErrors.length > 6 ? `\n… 외 ${rowErrors.length - 6}건` : ""}`,
        });
      } else {
        toast.success(okMsg);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "엑셀 처리 중 오류가 발생했습니다.");
    } finally {
      setExcelBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">품목 관리</h2>
          <p className="text-sm text-slate-600">품목 기본 정보를 등록하고 수정합니다.</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            전체 품목 수: {totalProducts.toLocaleString()} (사용: {activeProducts.toLocaleString()})
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={handleProductExcelSelected}
          />
          <Button type="button" variant="outline" disabled={excelBusy} onClick={handleDownloadProductTemplate}>
            양식 받기
          </Button>
          <Button
            type="button"
            disabled={excelBusy}
            onClick={() => {
              excelInputRef.current?.click();
            }}
          >
            엑셀 올리기
          </Button>
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
