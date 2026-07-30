import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { usageLogs, apiKeys, models } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { UsageClient } from "./usage-client";

export const metadata: Metadata = { title: "Usage Logs" };
export const dynamic = "force-dynamic";

export default async function ConsoleUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const filters = [eq(usageLogs.userId, userId)];

  if (params.model) {
    filters.push(eq(usageLogs.modelPublicId, params.model as string));
  }
  if (params.key) {
    filters.push(eq(usageLogs.apiKeyId, params.key as string));
  }
  if (params.from) {
    filters.push(gte(usageLogs.createdAt, new Date(params.from as string)));
  }
  if (params.to) {
    filters.push(lte(usageLogs.createdAt, new Date(params.to as string)));
  }

  const [countResult] = await db
    .select({ count: db.$count(usageLogs, and(...filters)) })
    .from(usageLogs);

  const logs = await db
    .select()
    .from(usageLogs)
    .where(and(...filters))
    .orderBy(desc(usageLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const userKeys = await db
    .select({ id: apiKeys.id, keyPrefix: apiKeys.keyPrefix, name: apiKeys.name })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  const modelList = await db
    .select({ publicId: models.publicId })
    .from(models)
    .where(eq(models.enabled, true));

  return (
    <UsageClient
      logs={logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        modelPublicId: l.modelPublicId,
        apiFormat: l.apiFormat,
        promptTokens: l.promptTokens,
        completionTokens: l.completionTokens,
        totalTokens: l.totalTokens,
        costMicroUsd: Number(l.costMicroUsd),
        status: l.status,
        latencyMs: l.latencyMs,
        apiKeyId: l.apiKeyId,
      }))}
      userKeys={userKeys.map((k) => ({
        id: k.id,
        prefix: k.keyPrefix,
        name: k.name,
      }))}
      modelList={modelList.map((m) => m.publicId)}
      currentPage={page}
      totalPages={Math.ceil((countResult?.count ?? 0) / limit)}
    />
  );
}
