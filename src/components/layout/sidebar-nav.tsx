"use client";

import { ClipboardList, FileText, Home, LogOut, Package, PanelLeftClose, PanelLeftOpen, Settings, Tags, Truck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { companyProfileQueryKey, fetchCompanyProfileForUser } from "@/lib/queries/company-profile";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/customers", label: "거래처 관리", icon: Users },
  { href: "/products", label: "품목 관리", icon: Package },
  { href: "/products/customers", label: "└ 품목별 주요거래처", icon: Package, isChild: true },
  { href: "/prices", label: "단가 관리", icon: Tags },
  { href: "/drivers", label: "배송기사 관리", icon: Truck },
  { href: "/sales/daily", label: "일일 판매 등록", icon: ClipboardList },
  { href: "/sales/delivery-sheet", label: "배송지시서 출력", icon: ClipboardList, isChild: true },
  { href: "/settlement/invoice", label: "정산 관리", icon: FileText, matchPrefix: "/settlement" },
  { href: "/settlement/invoice", label: "└ 거래명세서", icon: FileText, isChild: true },
  { href: "/settlement/deposits", label: "└ 입금 등록", icon: FileText, isChild: true },
  { href: "/settlement/daily-deposits", label: "└ 수금일보", icon: FileText, isChild: true },
  { href: "/settlement/balances", label: "└ 외상잔액 명세", icon: FileText, isChild: true },
];

type SidebarNavProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export function SidebarNav({ isCollapsed, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("로그인 사용자");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [metadataCompanyName, setMetadataCompanyName] = useState<string | undefined>(undefined);

  const {
    data: companyProfile,
    isPending: isCompanyLoading,
    isError: isCompanyError,
    error: companyError,
  } = useQuery({
    queryKey: companyProfileQueryKey,
    queryFn: fetchCompanyProfileForUser,
  });

  useEffect(() => {
    if (isCompanyError && companyError) {
      toast.error(companyError instanceof Error ? companyError.message : "회사 정보를 불러오지 못했습니다.");
    }
  }, [isCompanyError, companyError]);

  const headerTitle =
    isCompanyLoading && !companyProfile
      ? "…"
      : (companyProfile?.name?.trim() || metadataCompanyName || "회사 정보 없음");

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        toast.error(error.message);
        return;
      }

      const user = data.user;
      if (!isMounted) return;

      setUserEmail(user?.email ?? "이메일 없음");
      setMetadataCompanyName(
        (user?.user_metadata?.company_name as string | undefined)?.trim() || undefined
      );
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      setIsSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className={cn("flex flex-col justify-between border-r border-slate-200 bg-white transition-all", isCollapsed ? "w-20" : "w-64")}>
      <div>
        <div className={cn("border-b border-slate-200 py-4", isCollapsed ? "px-2" : "px-5")}>
          <div className={cn("flex items-start", isCollapsed ? "justify-center" : "justify-between gap-2")}>
            {!isCollapsed && (
              <div>
                <h1 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">{headerTitle}</h1>
                <p className="mt-1 text-xs text-slate-500">기준정보 관리</p>
              </div>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={onToggleCollapse} aria-label="사이드바 토글">
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {menuItems.map(({ href, icon: Icon, label, isChild, matchPrefix }) => {
            const activeBase = matchPrefix ?? href;
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(activeBase);

            return (
              <Link
                key={`${href}-${label}`}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
                  isCollapsed && "justify-center px-2",
                  isChild && "ml-4 py-1.5 text-xs",
                  isCollapsed && isChild && "ml-0",
                  isActive && "bg-slate-900 text-white hover:bg-slate-900",
                )}
                title={label.replace("└ ", "")}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={cn("border-t border-slate-200 p-3", isCollapsed && "px-2")}>
        {!isCollapsed && <p className="truncate px-1 text-xs text-slate-500">{userEmail}</p>}
        <Link
          href="/settings"
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
            isCollapsed && "justify-center px-2",
            pathname === "/settings" && "bg-slate-900 text-white hover:bg-slate-900",
          )}
          title="내 설정"
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && "내 설정"}
        </Link>
        <Button
          type="button"
          variant="ghost"
          className={cn("mt-1 w-full text-slate-700", isCollapsed ? "justify-center px-2" : "justify-start")}
          onClick={handleSignOut}
          disabled={isSigningOut}
          title={isSigningOut ? "로그아웃 중..." : "로그아웃"}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && (isSigningOut ? "로그아웃 중..." : "로그아웃")}
        </Button>
      </div>
    </aside>
  );
}
