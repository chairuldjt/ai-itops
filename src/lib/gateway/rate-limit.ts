import { getClient } from "@/lib/db";

export const RATE_WINDOW_MS = 60_000;

export function tokenBucketState(tokens: number, limit: number, refilledAtMs: number, nowMs: number, remainder = 0) {
  const accrued = Math.max(0, nowMs - refilledAtMs) * limit + remainder;
  const refill = Math.floor(accrued / RATE_WINDOW_MS);
  const available = Math.min(limit, tokens + refill);
  const allowed = available >= 1;
  const nextTokens = allowed ? available - 1 : available;
  const nextRemainder = available === limit ? 0 : accrued % RATE_WINDOW_MS;
  return { allowed, tokens: nextTokens, remainder: nextRemainder, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((RATE_WINDOW_MS - nextRemainder) / limit / 1000)) };
}

export async function consumeRateLimit(apiKeyId: string, limit: number, now = new Date()) {
  return getClient().begin(async (sql) => {
    await sql`insert into api_rate_limit_bucket (api_key_id, tokens, refill_remainder, refilled_at) values (${apiKeyId}, ${limit}, 0, ${now.toISOString()}) on conflict do nothing`;
    const rows = await sql`select tokens, refill_remainder, refilled_at from api_rate_limit_bucket where api_key_id = ${apiKeyId} for update`;
    const state = tokenBucketState(Number(rows[0].tokens), limit, new Date(rows[0].refilled_at).getTime(), now.getTime(), Number(rows[0].refill_remainder));
    await sql`update api_rate_limit_bucket set tokens = ${state.tokens}, refill_remainder = ${state.remainder}, refilled_at = ${now.toISOString()} where api_key_id = ${apiKeyId}`;
    return { allowed: state.allowed, retryAfterSeconds: state.retryAfterSeconds };
  });
}
