"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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

type DriverRow = Tables<"delivery_drivers">;
type DriverInsert = TablesInsert<"delivery_drivers">;
type DriverUpdate = TablesUpdate<"delivery_drivers">;
type RegionRow = Tables<"regions">;

const initialForm: DriverInsert = {
  name: "",
  vehicle_number: "",
  region_groups: [],
  is_active: true,
};

function getDriverSaveErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "동일한 차량번호가 이미 존재합니다. (회사별 중복 또는 DB 제약 확인 필요)";
  }
  return error.message || "저장 중 오류가 발생했습니다.";
}

async function fetchDrivers() {
  const { data, error } = await supabase
    .from("delivery_drivers")
    .select("id, name, vehicle_number, region_groups, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as DriverRow[];
}

async function fetchRegions() {
  const { data, error } = await supabase.from("regions").select("id, code, name").order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []) as RegionRow[];
}

export function DriverManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverInsert>(initialForm);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["delivery-drivers"],
    queryFn: fetchDrivers,
  });
  const { data: regions = [] } = useQuery({
    queryKey: ["regions", "driver-management"],
    queryFn: fetchRegions,
  });

  const regionLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const region of regions) {
      map.set(region.code, region.name);
    }
    return map;
  }, [regions]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: DriverInsert) => {
      if (editingId) {
        const updatePayload: DriverUpdate = {
          name: payload.name,
          vehicle_number: payload.vehicle_number,
          region_groups: payload.region_groups ?? [],
          is_active: payload.is_active ?? true,
        };
        const { error } = await supabase.from("delivery_drivers").update(updatePayload).eq("id", editingId);
        if (error) {
          throw error;
        }
        return;
      }

      const { error } = await supabase.from("delivery_drivers").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("배송기사 정보가 저장되었습니다.");
      setOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["delivery-drivers"] });
    },
    onError: (error) => {
      toast.error(getDriverSaveErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase.from("delivery_drivers").delete().eq("id", driverId);
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success("배송기사가 삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["delivery-drivers"] });
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

  const openEditDialog = (driver: DriverRow) => {
    setEditingId(driver.id);
    setForm({
      name: driver.name,
      vehicle_number: driver.vehicle_number,
      region_groups: driver.region_groups ?? [],
      is_active: driver.is_active,
    });
    setOpen(true);
  };

  const toggleRegionCode = (regionCode: string, checked: boolean) => {
    const current = form.region_groups ?? [];
    const next = checked ? Array.from(new Set([...current, regionCode])) : current.filter((code) => code !== regionCode);
    setForm((prev) => ({
      ...prev,
      region_groups: next,
    }));
  };

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">배송기사 관리</h2>
          <p className="text-sm text-slate-600">기사와 차량, 담당 지역을 등록하고 수정합니다.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreateDialog}>신규 기사 등록</Button>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "배송기사 수정" : "신규 배송기사 등록"}</DialogTitle>
              <DialogDescription>담당 지역을 다중 선택해 저장할 수 있습니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="driver-name">기사 이름</Label>
                <Input
                  id="driver-name"
                  value={form.name ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driver-vehicle">차량 번호</Label>
                <Input
                  id="driver-vehicle"
                  value={form.vehicle_number ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, vehicle_number: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>담당 지역 (다중 선택)</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                  {regions.map((region) => {
                    const checked = (form.region_groups ?? []).includes(region.code);
                    return (
                      <label key={region.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleRegionCode(region.code, event.target.checked)}
                        />
                        <span>
                          {region.name} ({region.code})
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  저장값: {(form.region_groups ?? []).join(",") || "-"}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="driver-active">사용 여부</Label>
                <Switch
                  id="driver-active"
                  checked={!!form.is_active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
              <Button
                onClick={() => upsertMutation.mutate(form)}
                disabled={upsertMutation.isPending || !form.name || !form.vehicle_number}
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
            <TableHead>기사명</TableHead>
            <TableHead>차량번호</TableHead>
            <TableHead>담당 지역</TableHead>
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
          {!isLoading && drivers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                등록된 배송기사가 없습니다.
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            drivers.map((driver) => {
              const regionText = (driver.region_groups ?? [])
                .map((code) => regionLabelByCode.get(code) ?? code)
                .join(", ");

              return (
                <TableRow key={driver.id}>
                  <TableCell>{driver.name}</TableCell>
                  <TableCell>{driver.vehicle_number}</TableCell>
                  <TableCell>{regionText || "-"}</TableCell>
                  <TableCell>{driver.is_active ? "사용" : "미사용"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(driver)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const ok = window.confirm(`${driver.name} 기사 정보를 삭제하시겠습니까?`);
                        if (!ok || deleteMutation.isPending) {
                          return;
                        }
                        deleteMutation.mutate(driver.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </section>
  );
}
