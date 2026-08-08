import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { models } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ModelsClient } from "./models-client";

export const metadata: Metadata = { title: "Models" };
export const dynamic = "force-dynamic";

export default async function ConsoleModelsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const modelList = await db
    .select()
    .from(models)
    .where(eq(models.enabled, true))
    .orderBy(models.sortOrder);

  return (
    <ModelsClient
      models={modelList.map((m) => ({
        id: m.id,
        publicId: m.publicId,
        upstreamId: m.upstreamId,
        type: m.type,
        description: m.description ?? "",
        provider: m.provider ?? "Unknown",
        pricing: (m.pricing ?? {}) as {
          per1MInput?: number;
          per1MOutput?: number;
          per1MCached?: number;
          per1MCacheRead?: number;
          per1MCacheWrite?: number;
          perUnit?: number;
        },
        capabilities: (m.capabilities ?? {}) as {
          supportsImageInput?: boolean;
          supportsStreaming?: boolean;
          maxContextTokens?: number;
        },
        tags: m.tags ?? [],
      }))}
    />
  );
}
