"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { handleEnterToNextField } from "@/lib/keyboard/enter-to-next-field";
import {
  companyProfileQueryKey,
  fetchCompanyProfileForUser,
  type CompanyProfileQueryData,
} from "@/lib/queries/company-profile";
import { supabase } from "@/lib/supabase/client";

const COMPANY_FIELD_ORDER = [
  "settings-company-name",
  "settings-company-business-number",
  "settings-company-ceo-name",
  "settings-company-phone",
  "settings-company-address",
] as const;

const SECURITY_FIELD_ORDER = ["settings-security-password", "settings-security-password-confirm"] as const;

type CompanyFormState = {
  name: string;
  business_number: string;
  ceo_name: string;
  phone: string;
  address: string;
  bank_accounts: { bank_name: string; account_number: string; account_holder: string }[];
};

function toFormState(data: CompanyProfileQueryData | null | undefined): CompanyFormState {
  if (!data) {
    return { name: "", business_number: "", ceo_name: "", phone: "", address: "", bank_accounts: [] };
  }
  return {
    name: data.name ?? "",
    business_number: data.business_number ?? "",
    ceo_name: data.ceo_name ?? "",
    phone: data.phone ?? "",
    address: data.address ?? "",
    bank_accounts: data.bank_accounts ?? [],
  };
}

export default function SettingsPage() {
  const formId = useId();
  const companyFormId = `${formId}-company`;
  const securityFormId = `${formId}-security`;
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: companyProfileQueryKey,
    queryFn: fetchCompanyProfileForUser,
  });

  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() => toFormState(undefined));

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setCompanyForm(toFormState(data ?? undefined));
  }, [data]);

  const updateCompany = useMutation({
    mutationFn: async () => {
      if (!data?.companyId) {
        throw new Error("접속 가능한 회사 정보가 없습니다.");
      }
      const payload = {
        name: companyForm.name.trim() || "회사",
        business_number: companyForm.business_number.trim() || null,
        ceo_name: companyForm.ceo_name.trim() || null,
        phone: companyForm.phone.trim() || null,
        address: companyForm.address.trim() || null,
        bank_accounts: companyForm.bank_accounts
          .map((account) => ({
            bank_name: account.bank_name.trim(),
            account_number: account.account_number.trim(),
            account_holder: account.account_holder.trim(),
          }))
          .filter((account) => account.bank_name || account.account_number || account.account_holder),
      };
      const { error: upError } = await supabase.from("companies").update(payload).eq("id", data.companyId);
      if (upError) throw new Error(upError.message);
    },
    onSuccess: async () => {
      toast.success("회사 정보를 저장했습니다.");
      await queryClient.invalidateQueries({ queryKey: companyProfileQueryKey });
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePassword = useMutation({
    mutationFn: async (password: string) => {
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw new Error(pwError.message);
    },
    onSuccess: async () => {
      toast.success("비밀번호를 변경했습니다.");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCompanyKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    handleEnterToNextField(e, [...COMPANY_FIELD_ORDER], () => {
      if (updateCompany.isPending) return;
      void updateCompany.mutateAsync();
    });
  }

  function onSecurityKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    handleEnterToNextField(e, [...SECURITY_FIELD_ORDER], () => {
      if (updatePassword.isPending) return;
      void submitPassword();
    });
  }

  function submitPassword() {
    if (newPassword.length < 6) {
      toast.error("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    updatePassword.mutate(newPassword);
  }

  function addBankAccount() {
    setCompanyForm((prev) => ({
      ...prev,
      bank_accounts: [...prev.bank_accounts, { bank_name: "", account_number: "", account_holder: "" }],
    }));
  }

  function removeBankAccount(index: number) {
    setCompanyForm((prev) => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter((_, idx) => idx !== index),
    }));
  }

  function updateBankAccount(
    index: number,
    field: "bank_name" | "account_number" | "account_holder",
    value: string,
  ) {
    setCompanyForm((prev) => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map((account, idx) => (idx === index ? { ...account, [field]: value } : account)),
    }));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">불러오는 중…</div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "불러오지 못했습니다."}</p>
        <Button type="button" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data?.companyId) {
    return <p className="text-sm text-slate-600">연결된 회사가 없어 설정을 표시할 수 없습니다.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">내 설정</h1>
        <p className="mt-1 text-sm text-slate-500">회사 정보와 로그인 보안을 관리합니다.</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="company">회사 정보</TabsTrigger>
          <TabsTrigger value="security">보안 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>회사 정보</CardTitle>
              <CardDescription>거래명세서 등에 표시될 정보입니다. 저장 시 즉시 반영됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id={companyFormId}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (updateCompany.isPending) return;
                  void updateCompany.mutateAsync();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="settings-company-name">회사명</Label>
                  <Input
                    id="settings-company-name"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))}
                    onKeyDown={onCompanyKeyDown}
                    autoComplete="organization"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-company-business-number">사업자등록번호</Label>
                  <Input
                    id="settings-company-business-number"
                    value={companyForm.business_number}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, business_number: e.target.value }))}
                    onKeyDown={onCompanyKeyDown}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-company-ceo-name">대표자명</Label>
                  <Input
                    id="settings-company-ceo-name"
                    value={companyForm.ceo_name}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, ceo_name: e.target.value }))}
                    onKeyDown={onCompanyKeyDown}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-company-phone">전화번호</Label>
                  <Input
                    id="settings-company-phone"
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, phone: e.target.value }))}
                    onKeyDown={onCompanyKeyDown}
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-company-address">주소</Label>
                  <Input
                    id="settings-company-address"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))}
                    onKeyDown={onCompanyKeyDown}
                    autoComplete="street-address"
                  />
                </div>
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <Label>입금 계좌</Label>
                    <Button type="button" variant="outline" onClick={addBankAccount}>
                      + 계좌 추가
                    </Button>
                  </div>
                  {companyForm.bank_accounts.length === 0 && (
                    <p className="text-xs text-slate-500">등록된 계좌가 없습니다. 첫 번째 계좌가 거래명세서에 우선 표시됩니다.</p>
                  )}
                  {companyForm.bank_accounts.map((account, index) => (
                    <div key={`account-${index}`} className="grid gap-2 rounded-md border p-3">
                      <p className="text-xs font-medium text-slate-600">계좌 {index + 1}</p>
                      <Input
                        value={account.bank_name}
                        onChange={(e) => updateBankAccount(index, "bank_name", e.target.value)}
                        placeholder="은행명"
                      />
                      <Input
                        value={account.account_number}
                        onChange={(e) => updateBankAccount(index, "account_number", e.target.value)}
                        placeholder="계좌번호"
                      />
                      <Input
                        value={account.account_holder}
                        onChange={(e) => updateBankAccount(index, "account_holder", e.target.value)}
                        placeholder="예금주"
                      />
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" onClick={() => removeBankAccount(index)}>
                          삭제
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={updateCompany.isPending}>
                  {updateCompany.isPending ? "저장 중…" : "저장"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>보안 설정</CardTitle>
              <CardDescription>새 비밀번호를 입력한 뒤 저장합니다. 현재 비밀번호는 필요하지 않습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id={securityFormId}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPassword();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="settings-security-password">새 비밀번호</Label>
                  <Input
                    id="settings-security-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={onSecurityKeyDown}
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-security-password-confirm">새 비밀번호 확인</Label>
                  <Input
                    id="settings-security-password-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={onSecurityKeyDown}
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" disabled={updatePassword.isPending}>
                  {updatePassword.isPending ? "변경 중…" : "비밀번호 변경"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
