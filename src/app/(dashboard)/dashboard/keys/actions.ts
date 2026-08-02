"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { createId, generateApiKey } from "@/lib/id";
import { hashApiKey, MAX_RPM_LIMIT } from "@/lib/gateway/api-key";

/* -------------------------------------------------------------------------- */
/*                                     GET                                    */
/* -------------------------------------------------------------------------- */

export async function listMyApiKeys() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(apiKeys.createdAt);
  return rows;
}

/* -------------------------------------------------------------------------- */
/*                                    CREATE                                  */
/* -------------------------------------------------------------------------- */

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  // FIX #24: .finite() prevents Infinity.
  rpmLimit: z.number().int().min(1).max(MAX_RPM_LIMIT).finite().optional(),
  monthlyBudgetUsd: z.number().min(0).finite().optional(),
  expiresAt: z.coerce.date().optional(),
});

export async function createApiKey(input: z.infer<typeof CreateSchema>) {
  const session = await requireSession();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  const id = createId("key");
  const { key, prefix } = generateApiKey();
  const keyHash = hashApiKey(key);

  const monthlyBudget =
    parsed.data.monthlyBudgetUsd != null
      ? BigInt(Math.round(parsed.data.monthlyBudgetUsd * 1_000_000))
      : null;

  await db.insert(apiKeys).values({
    id,
    userId: session.user.id,
    name: parsed.data.name,
    keyHash,
    keyPrefix: prefix,
    rpmLimit: parsed.data.rpmLimit ?? null,
    monthlyBudget,
    enabled: true,
    expiresAt: parsed.data.expiresAt ?? null,
  });

  revalidatePath("/dashboard/keys");
  revalidatePath("/console/api-keys");
  // Return the raw key ONCE — it can never be retrieved again.
  return { ok: true, id, key };
}

/* -------------------------------------------------------------------------- */
/*                                    DELETE                                  */
/* -------------------------------------------------------------------------- */

export async function deleteApiKey(id: string) {
  const session = await requireSession();
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id)));
  revalidatePath("/dashboard/keys");
  revalidatePath("/console/api-keys");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                    TOGGLE                                  */
/* -------------------------------------------------------------------------- */

const ToggleSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export async function toggleApiKeyEnabled(id: string, enabled: boolean) {
  const session = await requireSession();
  // FIX #25: Validate inputs.
  const parsed = ToggleSchema.safeParse({ id, enabled });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  await db
    .update(apiKeys)
    .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
    .where(and(eq(apiKeys.id, parsed.data.id), eq(apiKeys.userId, session.user.id)));
  revalidatePath("/dashboard/keys");
  revalidatePath("/console/api-keys");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                   RENAME                                   */
/* -------------------------------------------------------------------------- */

const RenameSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
});

export async function renameApiKey(id: string, name: string) {
  const session = await requireSession();
  // FIX #25: Validate inputs.
  const parsed = RenameSchema.safeParse({ id, name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  await db
    .update(apiKeys)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(and(eq(apiKeys.id, parsed.data.id), eq(apiKeys.userId, session.user.id)));
  revalidatePath("/dashboard/keys");
  return { ok: true };
}
