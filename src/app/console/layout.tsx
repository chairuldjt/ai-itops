import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ConsoleLayoutClient } from "./console-layout-client";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const rawBalance = (session.user as Record<string, unknown>).creditBalance as bigint | number | string | undefined;
  const creditBalanceUsd =
    typeof rawBalance === "bigint"
      ? Number(rawBalance) / 1_000_000
      : Number(rawBalance ?? 0) / 1_000_000;

  const u = session.user as Record<string, unknown>;
  const image = (u.image as string) ?? "";
  const role = (u.role as string) ?? "user";

  return (
    <ConsoleLayoutClient
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image,
        role,
        creditBalance: creditBalanceUsd,
      }}
    >
      {children}
    </ConsoleLayoutClient>
  );
}
