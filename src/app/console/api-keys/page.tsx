import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { apiKeys, models } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiKeysClient } from "./api-keys-client";

export const metadata: Metadata = { title: "API Keys" };
export const dynamic = "force-dynamic";

export default async function ConsoleApiKeysPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(apiKeys.createdAt);

  const availableModels = await db
    .select({
      publicId: models.publicId,
      provider: models.provider,
    })
    .from(models)
    .where(eq(models.enabled, true))
    .orderBy(models.sortOrder);

  return (
    <ApiKeysClient
      initialKeys={keys.map((k) => ({
        ...k,
        monthlyBudget: k.monthlyBudget ? Number(k.monthlyBudget) : null,
        monthlySpent: k.monthlySpent ? Number(k.monthlySpent) : 0,
      }))}
      availableModels={availableModels.map((m) => ({
        id: m.publicId,
        provider: m.provider ?? "Unknown",
      }))}
    />
  );
}
