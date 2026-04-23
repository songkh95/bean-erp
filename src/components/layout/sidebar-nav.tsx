"use client";

import { Home, Package, Tags, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/customers", label: "거래처 관리", icon: Users },
  { href: "/products", label: "품목 관리", icon: Package },
  { href: "/prices", label: "단가 관리", icon: Tags },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bean ERP</p>
        <h1 className="mt-1 text-lg font-bold text-slate-900">기준정보 관리</h1>
      </div>
      <nav className="space-y-1 p-3">
        {menuItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
                isActive && "bg-slate-900 text-white hover:bg-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
