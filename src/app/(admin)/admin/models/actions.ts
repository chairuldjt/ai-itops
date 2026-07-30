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
  per1MCacheRead: z.number().min(0).optional(),
  per1MCacheWrite: z.number().min(0).optional(),
  perUnit: z.number().min(0).optional(),
});

const CapabilitiesSchema = z.object({
  supportsImageInput: z.boolean().optional(),
  supportsAudioInput: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
  supportsJson: z.boolean().optional(),
  supportsStreaming: z.boolean().optional(),
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
  const rows = await db.select().from(models).where(eq(models.id, id)).limit(1);
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
  revalidatePath("/dashboard/models");
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
  revalidatePath("/dashboard/models");
  revalidatePath("/models");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                    DELETE                                  */
/* -------------------------------------------------------------------------- */

export async function deleteModel(id: string) {
  await requireAdmin();
  await db.delete(models).where(eq(models.id, id));
  revalidatePath("/admin/models");
  revalidatePath("/dashboard/models");
  revalidatePath("/models");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                    TOGGLE                                  */
/* -------------------------------------------------------------------------- */

export async function toggleModelEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  await db
    .update(models)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(models.id, id));
  revalidatePath("/admin/models");
  return { ok: true };
}
