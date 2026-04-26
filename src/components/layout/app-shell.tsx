"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SidebarNav } from "@/components/layout/sidebar-nav";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname != null && AUTH_PATHS.has(pathname);

  if (hideSidebar) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
