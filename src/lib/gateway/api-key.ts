import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users, type User, type ApiKey } from "@/lib/db/schema";
import { consumeRateLimit } from "./rate-limit";

/**
 * Hash a raw API key with SHA-256. We never store the raw key.
 */
export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export const MAX_RPM_LIMIT = 1_000_000;

export function normalizeRpmLimit(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_RPM_LIMIT ? value : null;
}

export function extractApiKey(request: Request): string | null {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

export function apiKeyAccessDecision(
  key: Pick<ApiKey, "enabled" | "expiresAt">,
  user: Pick<User, "banned" | "banExpires">,
  now = new Date(),
): { ok: true } | { ok: false; status: 403; message: string } {
  if (!key.enabled) return { ok: false, status: 403, message: "API key is disabled" };
  if (key.expiresAt && key.expiresAt.getTime() <= now.getTime()) return { ok: false, status: 403, message: "API key has expired" };
  if (user.banned && (!user.banExpires || user.banExpires.getTime() > now.getTime())) return { ok: false, status: 403, message: "User is banned" };
  return { ok: true };
}

/**
 * Validate an API key, returning the user + key record if valid.
 *
 * Checks:
 *  - SHA-256 hash match
 *  - key enabled
 *  - not expired
 *  - user not banned
 *  - FIX #5: rate limit (rpm_limit)
 */
export async function authenticateApiKey(
  rawKey: string,
): Promise<
  | { ok: true; user: User; apiKey: ApiKey }
  | { ok: false; status: number; message: string; retryAfterSeconds?: number }
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

  const access = apiKeyAccessDecision(key, user);
  if (!access.ok) return access;

  if (key.rpmLimit != null) {
    const rpmLimit = normalizeRpmLimit(key.rpmLimit);
    if (rpmLimit == null) return { ok: false, status: 403, message: "API key rate limit is invalid" };
    const rate = await consumeRateLimit(key.id, rpmLimit);
    if (!rate.allowed) {
      return { ok: false, status: 429, message: "Rate limit exceeded. Try again later.", retryAfterSeconds: rate.retryAfterSeconds };
    }
  }

  return { ok: true, user, apiKey: key };
}
