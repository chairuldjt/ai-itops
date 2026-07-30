import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users, type User, type ApiKey } from "@/lib/db/schema";

/**
 * Hash a raw API key with SHA-256. We never store the raw key.
 */
export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Extract the raw API key from the `Authorization: Bearer sk_live_...`
 * header (case-insensitive) or the `?api_key=...` query param.
 */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("api_key") ?? url.searchParams.get("key");
  return q;
}

/**
 * Validate an API key, returning the user + key record if valid.
 *
 * Checks:
 *  - SHA-256 hash match
 *  - key enabled
 *  - not expired
 *  - user not banned
 */
export async function authenticateApiKey(
  rawKey: string,
): Promise<
  | { ok: true; user: User; apiKey: ApiKey }
  | { ok: false; status: number; message: string }
> {
  if (!rawKey) {
    return { ok: false, status: 401, message: "Missing API key" };
  }
  const keyHash = hashApiKey(rawKey);

  const rows = await db
    .select({ key: apiKeys, user: users })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, status: 401, message: "Invalid API key" };
  }
  const { key, user } = rows[0];

  if (!key.enabled) {
    return { ok: false, status: 403, message: "API key is disabled" };
  }
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 403, message: "API key has expired" };
  }
  if (user.banned) {
    return { ok: false, status: 403, message: "User is banned" };
  }

  return { ok: true, user, apiKey: key };
}
