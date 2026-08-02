import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { SidebarShell } from "@/components/layout/sidebar-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <SidebarShell
      section="console"
      sidebar={<DashboardSidebar mode="dashboard" />}
    >
      {children}
    </SidebarShell>
  );
}
