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

// FIX #5: In-memory sliding window rate limiter per API key.
const rateLimitMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000; // 1 minute window

function checkRateLimit(keyId: string, rpmLimit: number): boolean {
  const now = Date.now();
  let timestamps = rateLimitMap.get(keyId);
  if (!timestamps) {
    timestamps = [];
    rateLimitMap.set(keyId, timestamps);
  }
  // Purge timestamps outside the window.
  while (timestamps.length > 0 && timestamps[0] <= now - RATE_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= rpmLimit) {
    return false; // Rate limit exceeded.
  }
  timestamps.push(now);
  return true;
}

// Periodically clean up stale entries to prevent memory leak.
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [key, timestamps] of rateLimitMap) {
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }
    if (timestamps.length === 0) rateLimitMap.delete(key);
  }
}, 60_000);

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

  // FIX #5: Enforce per-key rate limit.
  if (key.rpmLimit != null && key.rpmLimit > 0) {
    if (!checkRateLimit(key.id, key.rpmLimit)) {
      return { ok: false, status: 429, message: "Rate limit exceeded. Try again later." };
    }
  }

  return { ok: true, user, apiKey: key };
}
