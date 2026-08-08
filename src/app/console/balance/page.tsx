import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { creditTransactions, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { BalanceClient } from "./balance-client";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function ConsoleBalancePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  // Fetch credit balance directly from the DB. The better-auth session does
  // not carry custom user fields (creditBalance is always undefined there).
  const [userRow] = await db
    .select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const creditBalanceUsd = userRow
    ? Number(userRow.creditBalance) / 1_000_000
    : 0;

  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(100);

  return (
    <BalanceClient
      creditBalance={creditBalanceUsd}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount) / 1_000_000,
        balanceAfter: Number(t.balanceAfter) / 1_000_000,
        note: t.note,
        createdAt: t.createdAt,
      }))}
    />
  );
}
