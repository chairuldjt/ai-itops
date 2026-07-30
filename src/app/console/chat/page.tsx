import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { apiKeys, models } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ChatClient } from "./chat-client";

export const metadata: Metadata = { title: "Chat Playground" };
export const dynamic = "force-dynamic";

export default async function ConsoleChatPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const [firstKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(desc(apiKeys.createdAt))
    .limit(1);

  const availableModels = await db
    .select({
      id: models.id,
      publicId: models.publicId,
      description: models.description,
      provider: models.provider,
      type: models.type,
    })
    .from(models)
    .where(eq(models.enabled, true))
    .orderBy(models.sortOrder);

  return (
    <ChatClient
      userApiKeyPrefix={firstKey?.keyPrefix ?? null}
      models={availableModels.map((m) => ({
        id: m.publicId,
        name: m.publicId,
        provider: m.provider ?? "Unknown",
        description: m.description ?? "",
      }))}
    />
  );
}
