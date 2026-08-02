import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { ConsoleSidebar } from "./console-sidebar";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <SidebarShell section="console" sidebar={<ConsoleSidebar />}>
      {children}
    </SidebarShell>
  );
}
