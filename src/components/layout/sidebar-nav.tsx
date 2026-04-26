"use client";

import { ClipboardList, FileText, Home, LogOut, Package, Tags, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  { href: "/settlement/invoice", label: "거래명세서", icon: FileText },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState<string>("회사 정보 없음");
  const [userEmail, setUserEmail] = useState<string>("로그인 사용자");
  const [isSigningOut, setIsSigningOut] = useState(false);

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

      if (!user) {
        setCompanyName("회사 정보 없음");
        return;
      }

      const { data: row, error: companyError } = await supabase
        .from("company_users")
        .select("companies ( name )")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (companyError) {
        toast.error(companyError.message);
        if (isMounted) {
          setCompanyName((user.user_metadata?.company_name as string | undefined) ?? "회사 정보 없음");
        }
        return;
      }

      const fromDb =
        row?.companies != null && !Array.isArray(row.companies)
          ? (row.companies as { name: string }).name
          : null;
      const fromMetadata = user.user_metadata?.company_name as string | undefined;

      if (isMounted) {
        setCompanyName(fromDb ?? fromMetadata ?? "회사 정보 없음");
      }
    }

    loadUser();

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
    <aside className="flex w-64 flex-col justify-between border-r border-slate-200 bg-white">
      <div>
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bean ERP</p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">기준정보 관리</h1>
        </div>
        <nav className="space-y-1 p-3">
          {menuItems.map(({ href, icon: Icon, label, isChild }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
                  isChild && "ml-4 py-1.5 text-xs",
                  isActive && "bg-slate-900 text-white hover:bg-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-3">
        <p className="truncate px-1 text-xs font-medium text-slate-700">{companyName}</p>
        <p className="truncate px-1 text-xs text-slate-500">{userEmail}</p>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full justify-start text-slate-700"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>
    </aside>
  );
}
