"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  models,
  type ModelType,
  type ImageInputPolicy,
  type ModelPricing,
  type ModelCapabilities,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createId } from "@/lib/id";

const PricingSchema = z.object({
  per1MInput: z.number().min(0).optional(),
  per1MOutput: z.number().min(0).optional(),
  per1MCached: z.number().min(0).optional(),
  perUnit: z.number().min(0).optional(),
});

const CapabilitiesSchema = z.object({
  supportsImageInput: z.boolean().optional(),
  supportsAudioInput: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
  supportsJson: z.boolean().optional(),
  supportsStreaming: z.boolean().optional(),
  supportsCache: z.boolean().optional(),
  maxContextTokens: z.number().int().min(0).optional(),
});

const ModelFormSchema = z.object({
  publicId: z.string().min(1).max(64),
  upstreamId: z.string().min(1).max(128),
  type: z.enum(["chat", "image", "tts", "stt", "embedding", "rerank"]),
  description: z.string().max(500).optional(),
  provider: z.string().max(64).optional(),
  pricing: PricingSchema.default({}),
  capabilities: CapabilitiesSchema.default({}),
  imagePolicy: z.enum(["strip_and_instruct", "canned_response", "reject_error"]),
  cannedResponseText: z.string().max(2000).optional(),
  stripInstruction: z.string().max(4000).optional(),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).default(0),
  tags: z.array(z.string().max(32)).default([]),
});

export type ModelFormInput = z.infer<typeof ModelFormSchema>;

/* -------------------------------------------------------------------------- */
/*                                     GET                                    */
/* -------------------------------------------------------------------------- */

export async function listAllModels() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(models)
    .orderBy(models.sortOrder, models.publicId);
  return rows;
}

export async function getModel(id: string) {
  await requireAdmin();
  // FIX #25: Validate id input.
  const validId = z.string().min(1).safeParse(id);
  if (!validId.success) return null;
  const rows = await db.select().from(models).where(eq(models.id, validId.data)).limit(1);
  return rows[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/*                                    CREATE                                  */
/* -------------------------------------------------------------------------- */

export async function createModel(input: ModelFormInput) {
  await requireAdmin();
  const parsed = ModelFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  const id = createId("mdl");
  await db.insert(models).values({
    id,
    publicId: parsed.data.publicId,
    upstreamId: parsed.data.upstreamId,
    type: parsed.data.type as ModelType,
    description: parsed.data.description ?? null,
    provider: parsed.data.provider ?? null,
    pricing: parsed.data.pricing as ModelPricing,
    capabilities: parsed.data.capabilities as ModelCapabilities,
    imagePolicy: parsed.data.imagePolicy as ImageInputPolicy,
    cannedResponseText: parsed.data.cannedResponseText ?? null,
    stripInstruction: parsed.data.stripInstruction ?? null,
    enabled: parsed.data.enabled,
    sortOrder: parsed.data.sortOrder,
    tags: parsed.data.tags,
  });
  revalidatePath("/admin/models");
  revalidatePath("/models");
  return { ok: true, id };
}

/* -------------------------------------------------------------------------- */
/*                                    UPDATE                                  */
/* -------------------------------------------------------------------------- */

export async function updateModel(id: string, input: ModelFormInput) {
  await requireAdmin();
  const parsed = ModelFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  await db
    .update(models)
    .set({
      publicId: parsed.data.publicId,
      upstreamId: parsed.data.upstreamId,
      type: parsed.data.type as ModelType,
      description: parsed.data.description ?? null,
      provider: parsed.data.provider ?? null,
      pricing: parsed.data.pricing as ModelPricing,
      capabilities: parsed.data.capabilities as ModelCapabilities,
      imagePolicy: parsed.data.imagePolicy as ImageInputPolicy,
      cannedResponseText: parsed.data.cannedResponseText ?? null,
      stripInstruction: parsed.data.stripInstruction ?? null,
      enabled: parsed.data.enabled,
      sortOrder: parsed.data.sortOrder,
      tags: parsed.data.tags,
      updatedAt: new Date(),
    })
    .where(eq(models.id, id));
  revalidatePath("/admin/models");
  revalidatePath("/models");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                    DELETE                                  */
/* -------------------------------------------------------------------------- */

export async function deleteModel(id: string) {
  await requireAdmin();
  // FIX #25: Validate id input.
  const validId = z.string().min(1).safeParse(id);
  if (!validId.success) {
    return { ok: false, error: "Invalid model ID" };
  }
  try {
    await db.delete(models).where(eq(models.id, validId.data));
  } catch (err) {
    // Only fallback to disable on FK constraint violation, not on connection errors.
    // Drizzle wraps Postgres errors in err.cause — check both.
    const cause = err instanceof Error ? err.cause : undefined;
    const allMsg = [
      err instanceof Error ? err.message : "",
      cause instanceof Error ? cause.message : "",
      String(cause ?? ""),
    ].join(" ");
    const causeCode = (cause as { code?: string } | undefined)?.code;
    const isFkViolation =
      allMsg.includes("foreign key") ||
      allMsg.includes("23503") ||
      causeCode === "23503";
    if (!isFkViolation) throw err;
    // FK reference exists — disable instead of delete.
    await db
      .update(models)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(models.id, validId.data));
    revalidatePath("/admin/models");
    revalidatePath("/models");
    return { ok: true, deleted: false, reason: "has_usage_logs" };
  }
  revalidatePath("/admin/models");
  revalidatePath("/models");
  return { ok: true, deleted: true };
}

/* -------------------------------------------------------------------------- */
/*                                    TOGGLE                                  */
/* -------------------------------------------------------------------------- */

const ToggleModelSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export async function toggleModelEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  // FIX #25: Validate inputs.
  const parsed = ToggleModelSchema.safeParse({ id, enabled });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  await db
    .update(models)
    .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
    .where(eq(models.id, parsed.data.id));
  revalidatePath("/admin/models");
  return { ok: true };
}
