"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const SidebarNav = dynamic(
  () => import("@/components/layout/sidebar-nav").then((m) => m.SidebarNav),
  { ssr: true },
);

const AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password", "/update-password"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname != null && AUTH_PATHS.has(pathname);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (hideSidebar) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
