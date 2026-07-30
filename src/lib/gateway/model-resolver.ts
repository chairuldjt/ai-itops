import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { models, type Model } from "@/lib/db/schema";

const modelCache = new Map<string, { model: Model; expiry: number }>();
const CACHE_TTL_MS = 10_000; // 10s TTL

/**
 * Resolve a public model id (e.g. "my-gpt-4o") to the full model row.
 * Only enabled models are returned.
 */
export async function resolveModel(
  publicId: string,
): Promise<{ ok: true; model: Model } | { ok: false; status: number; message: string }> {
  if (!publicId) {
    return { ok: false, status: 400, message: "Missing model" };
  }

  const now = Date.now();
  const cached = modelCache.get(publicId);
  if (cached && cached.expiry > now) {
    if (!cached.model.enabled) {
      return { ok: false, status: 404, message: `Model '${publicId}' is currently unavailable` };
    }
    return { ok: true, model: cached.model };
  }

  const rows = await db
    .select()
    .from(models)
    .where(eq(models.publicId, publicId))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, status: 404, message: `Model '${publicId}' not found` };
  }
  const model = rows[0];
  modelCache.set(publicId, { model, expiry: now + CACHE_TTL_MS });

  if (!model.enabled) {
    return {
      ok: false,
      status: 404,
      message: `Model '${publicId}' is currently unavailable`,
    };
  }
  return { ok: true, model };
}

/**
 * Fetch all enabled models for the public catalog.
 */
export async function listEnabledModels(): Promise<Model[]> {
  return db
    .select()
    .from(models)
    .where(eq(models.enabled, true))
    .orderBy(models.sortOrder, models.publicId);
}
