import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { usageLogs, apiKeys, users } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";
import type { RangeValue } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<Exclude<RangeValue, "all">, number> = {
  "30d": 30,
  "7d": 7,
  today: 1,
};

function parseRange(raw: string | string[] | undefined): RangeValue {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "all" || v === "30d" || v === "7d" || v === "today") return v;
  return "30d";
}

export default async function ConsoleDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const range = parseRange(params.range);

  const userId = session.user.id;

  // Fetch credit balance directly from DB (better-auth session doesn't include custom fields)
  const [userRow] = await db
    .select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const creditBalanceUsd = userRow
    ? Number(userRow.creditBalance) / 1_000_000
    : 0;

  const now = new Date();
  const rangeStart =
    range === "all"
      ? null
      : new Date(now.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);

  const timeFilters = rangeStart
    ? [eq(usageLogs.userId, userId), gte(usageLogs.createdAt, rangeStart)]
    : [eq(usageLogs.userId, userId)];

  const [usageStats] = await db
    .select({
      totalSpend: sql<number>`coalesce(sum(${usageLogs.costMicroUsd}), 0)`,
      totalRequests: sql<number>`coalesce(count(*), 0)`,
      totalPromptTokens: sql<number>`coalesce(sum(${usageLogs.promptTokens}), 0)`,
      totalCompletionTokens: sql<number>`coalesce(sum(${usageLogs.completionTokens}), 0)`,
      successfulRequests: sql<number>`coalesce(sum(case when ${usageLogs.status} = 'ok' then 1 else 0 end), 0)`,
      firstLogAt: sql<Date | null>`min(${usageLogs.createdAt})`,
    })
    .from(usageLogs)
    .where(and(...timeFilters));

  // Postgres count(*)/sum() come back as bigint, which the driver returns as
  // STRINGS (drizzle's sql<number> is a type hint, not a conversion). Coerce
  // before ANY arithmetic — otherwise "2" + "3" concatenates and comparisons
  // misbehave, and the UI renders zeros.
  const totalRequests = Number(usageStats.totalRequests ?? 0);
  const totalPromptTokens = Number(usageStats.totalPromptTokens ?? 0);
  const totalCompletionTokens = Number(usageStats.totalCompletionTokens ?? 0);
  const successfulRequests = Number(usageStats.successfulRequests ?? 0);

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
    .where(and(...timeFilters))
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
    .where(and(...timeFilters))
    .groupBy(sql`${usageLogs.createdAt}::date`)
    .orderBy(sql`${usageLogs.createdAt}::date`);

  // Average rates are per-minute over the number of days actually covered:
  // the selected preset window, or (for "all") the span since the first log.
  let daySpan: number;
  if (range !== "all") {
    daySpan = RANGE_DAYS[range];
  } else if (usageStats.firstLogAt) {
    daySpan = Math.max(
      1,
      Math.ceil((now.getTime() - new Date(usageStats.firstLogAt).getTime()) / (24 * 60 * 60 * 1000))
    );
  } else {
    daySpan = 1;
  }

  const avgRpm =
    totalRequests > 0
      ? Math.round(totalRequests / daySpan)
      : 0;
  const avgTpm =
    totalRequests > 0
      ? Math.round((totalPromptTokens + totalCompletionTokens) / daySpan)
      : 0;

  return (
    <DashboardClient
      userName={session.user.name}
      creditBalance={creditBalanceUsd}
      range={range}
      stats={{
        totalSpend: Number(usageStats.totalSpend) / 1_000_000,
        totalRequests,
        avgRpm,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        successfulRequests,
        avgTpm,
        keyCount: Number(keyCount.count ?? 0),
      }}
      modelConsumption={modelConsumption.map((m) => ({
        model: m.model,
        cost: Number(m.cost) / 1_000_000,
        requests: Number(m.requests),
      }))}
      dailyTrend={dailyTrend.map((d) => ({
        date: d.date,
        cost: Number(d.cost) / 1_000_000,
        requests: Number(d.requests),
      }))}
    />
  );
}
