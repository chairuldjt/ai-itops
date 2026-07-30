import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ConsoleTopBar } from "@/app/console/console-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const u = session.user as Record<string, unknown>;
  const rawBalance = u.creditBalance as bigint | number | string | undefined;
  const creditBalanceUsd =
    typeof rawBalance === "bigint"
      ? Number(rawBalance) / 1_000_000
      : Number(rawBalance ?? 0) / 1_000_000;

  return (
    <SidebarProvider>
      <DashboardSidebar mode="dashboard" />
      <SidebarInset>
        <ConsoleTopBar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: (u.image as string) ?? "",
            creditBalance: creditBalanceUsd,
            role: (u.role as string) ?? "user",
          }}
        />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
