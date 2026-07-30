import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { usageLogs, apiKeys } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function ConsoleDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const rawBalance = (session.user as { creditBalance?: bigint | number | string }).creditBalance;
  const creditBalanceUsd =
    typeof rawBalance === "bigint"
      ? Number(rawBalance) / 1_000_000
      : Number(rawBalance ?? 0) / 1_000_000;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [usageStats] = await db
    .select({
      totalSpend: sql<number>`coalesce(sum(${usageLogs.costMicroUsd}), 0)`,
      totalRequests: sql<number>`coalesce(count(*), 0)`,
      totalPromptTokens: sql<number>`coalesce(sum(${usageLogs.promptTokens}), 0)`,
      totalCompletionTokens: sql<number>`coalesce(sum(${usageLogs.completionTokens}), 0)`,
      successfulRequests: sql<number>`coalesce(sum(case when ${usageLogs.status} = 'ok' then 1 else 0 end), 0)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        gte(usageLogs.createdAt, thirtyDaysAgo)
      )
    );

  const [keyCount] = await db
    .select({ count: sql<number>`coalesce(count(*), 0)` })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  const modelConsumption = await db
    .select({
      model: usageLogs.modelPublicId,
      cost: sql<number>`coalesce(sum(${usageLogs.costMicroUsd}), 0)`,
      requests: sql<number>`coalesce(count(*), 0)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        gte(usageLogs.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(usageLogs.modelPublicId)
    .orderBy(sql`sum(${usageLogs.costMicroUsd}) desc`)
    .limit(10);

  const dailyTrend = await db
    .select({
      date: sql<string>`to_char(${usageLogs.createdAt}::date, 'MM-DD')`,
      cost: sql<number>`coalesce(sum(${usageLogs.costMicroUsd}), 0)`,
      requests: sql<number>`coalesce(count(*), 0)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        gte(usageLogs.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`${usageLogs.createdAt}::date`)
    .orderBy(sql`${usageLogs.createdAt}::date`);

  const avgRpm =
    usageStats.totalRequests > 0
      ? Math.round(usageStats.totalRequests / 30)
      : 0;
  const avgTpm =
    usageStats.totalRequests > 0
      ? Math.round(
          (usageStats.totalPromptTokens + usageStats.totalCompletionTokens) /
            30
        )
      : 0;

  return (
    <DashboardClient
      userName={session.user.name}
      creditBalance={creditBalanceUsd}
      stats={{
        totalSpend: Number(usageStats.totalSpend) / 1_000_000,
        totalRequests: usageStats.totalRequests,
        avgRpm,
        totalTokens:
          usageStats.totalPromptTokens + usageStats.totalCompletionTokens,
        successfulRequests: usageStats.successfulRequests,
        avgTpm,
        keyCount: keyCount.count,
      }}
      modelConsumption={modelConsumption.map((m) => ({
        model: m.model,
        cost: Number(m.cost) / 1_000_000,
        requests: m.requests,
      }))}
      dailyTrend={dailyTrend.map((d) => ({
        date: d.date,
        cost: Number(d.cost) / 1_000_000,
        requests: d.requests,
      }))}
    />
  );
}
