import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ConsoleLayoutClient } from "./console-layout-client";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Fetch credit balance directly from DB (better-auth session doesn't include custom fields)
  const [userRow] = await db
    .select({ creditBalance: users.creditBalance, image: users.image, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const creditBalanceUsd = userRow
    ? Number(userRow.creditBalance) / 1_000_000
    : 0;

  return (
    <ConsoleLayoutClient
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: userRow?.image ?? "",
        role: userRow?.role ?? "user",
        creditBalance: creditBalanceUsd,
      }}
    >
      {children}
    </ConsoleLayoutClient>
  );
}
