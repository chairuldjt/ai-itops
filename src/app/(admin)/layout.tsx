import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ConsoleTopBar } from "@/app/console/console-layout-client";
import { FadeIn } from "@/components/motion";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const [userRow] = await db
    .select({ creditBalance: users.creditBalance, image: users.image, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const creditBalanceUsd = userRow
    ? Number(userRow.creditBalance) / 1_000_000
    : 0;

  return (
    <SidebarProvider>
      <DashboardSidebar mode="admin" />
      <SidebarInset>
        <ConsoleTopBar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: userRow?.image ?? "",
            creditBalance: creditBalanceUsd,
            role: userRow?.role ?? "admin",
          }}
        />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <FadeIn duration={0.3} y={12}>
            {children}
          </FadeIn>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
