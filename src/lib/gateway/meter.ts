import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiKeys,
  creditTransactions,
  usageLogs,
  users,
  type Model,
  type UsageStatus,
} from "@/lib/db/schema";
import { createId } from "@/lib/id";

/* -------------------------------------------------------------------------- */
/*                               Cost calculation                             */
/* -------------------------------------------------------------------------- */

/**
 * Convert a USD amount to micro-USD (bigint).
 * e.g. usdToMicro(0.003) => 3000n (i.e. $0.003 = 3000 micro-USD)
 */
export function usdToMicro(usd: number): bigint {
  return BigInt(Math.round(usd * 1_000_000));
}

/**
 * Compute the cost of a request given token counts and model pricing.
 * Pricing is stored as USD per 1M tokens.
 *
 * For non-chat endpoints (image/TTS/embeddings), use `unitCount` +
 * pricing.perUnit.
 */
export function computeCostMicroUsd(params: {
  model: Model;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  unitCount?: number;
}): bigint {
  const pricing = params.model.pricing ?? {};
  let total = 0;

  if (params.unitCount != null && pricing.perUnit != null) {
    // Flat unit pricing (image/TTS/embedding)
    total = pricing.perUnit * params.unitCount;
    return usdToMicro(total);
  }

  if (pricing.per1MInput != null) {
    total += (params.promptTokens / 1_000_000) * pricing.per1MInput;
  }
  if (pricing.per1MOutput != null) {
    total += (params.completionTokens / 1_000_000) * pricing.per1MOutput;
  }
  if (pricing.per1MCacheRead != null && params.cacheReadTokens) {
    total += (params.cacheReadTokens / 1_000_000) * pricing.per1MCacheRead;
  }
  if (pricing.per1MCacheWrite != null && params.cacheWriteTokens) {
    total += (params.cacheWriteTokens / 1_000_000) * pricing.per1MCacheWrite;
  }

  return usdToMicro(total);
}

/* -------------------------------------------------------------------------- */
/*                              Metering / persist                            */
/* -------------------------------------------------------------------------- */

export interface MeterRecordInput {
  userId: string;
  apiKeyId: string;
  modelId: string;
  modelPublicId: string;
  apiFormat: "openai" | "anthropic" | "images" | "audio" | "embedding" | "rerank";
  endpoint: string;
  streamed: boolean;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  unitCount?: number;
  status: UsageStatus;
  httpStatus: number;
  errorMessage?: string | null;
  latencyMs?: number | null;
  clientIp?: string | null;
  model: Model;
}

export interface MeterResult {
  usageLogId: string;
  costMicroUsd: bigint;
  newBalance: bigint;
}

/**
 * Record a usage log, deduct the cost from the user's credit balance,
 * update the api key's monthly spend, and create a credit transaction.
 *
 * All updates happen in a single transaction so the numbers stay consistent.
 *
 * Pre-checks (before calling upstream) are done by the caller; this function
 * only runs after the response is available, so it must not fail the client
 * request.
 */
export async function recordUsageAndDeduct(
  input: MeterRecordInput,
): Promise<MeterResult> {
  const cost = computeCostMicroUsd({
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    cacheReadTokens: input.cacheReadTokens,
    cacheWriteTokens: input.cacheWriteTokens,
    unitCount: input.unitCount,
  });

  const totalTokens = input.promptTokens + input.completionTokens;
  const usageLogId = createId("use");
  const txId = createId("ctx");

  // Use a transaction to atomically:
  //   1) insert usage_log
  //   2) decrement user.credit_balance
  //   3) increment api_key.monthly_spent + last_used_at
  //   4) insert credit_transaction
  return db.transaction(async (tx) => {
    await tx.insert(usageLogs).values({
      id: usageLogId,
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      modelId: input.modelId,
      modelPublicId: input.modelPublicId,
      apiFormat: input.apiFormat,
      endpoint: input.endpoint,
      streamed: input.streamed,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens,
      costMicroUsd: cost,
      status: input.status,
      httpStatus: input.httpStatus,
      errorMessage: input.errorMessage ?? null,
      latencyMs: input.latencyMs ?? null,
      clientIp: input.clientIp ?? null,
    });

    // Deduct credit from user balance. Allow balance to go negative for
    // requests that were already in flight; the pre-check blocks new
    // requests when balance is <= 0.
    const [updatedUser] = await tx
      .update(users)
      .set({
        creditBalance: sql`${users.creditBalance} - ${cost}::bigint`,
      })
      .where(eq(users.id, input.userId))
      .returning({ creditBalance: users.creditBalance });

    // Bump api key monthly spend + last used
    await tx
      .update(apiKeys)
      .set({
        monthlySpent: sql`${apiKeys.monthlySpent} + ${cost}::bigint`,
        lastUsedAt: new Date(),
      })
      .where(eq(apiKeys.id, input.apiKeyId));

    await tx.insert(creditTransactions).values({
      id: txId,
      userId: input.userId,
      type: "deduction",
      amount: -cost,
      balanceAfter: updatedUser.creditBalance,
      note: `${input.apiFormat}:${input.endpoint} on ${input.modelPublicId}`,
      usageLogId,
    });

    return {
      usageLogId,
      costMicroUsd: cost,
      newBalance: updatedUser.creditBalance,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                                Pre-checks                                  */
/* -------------------------------------------------------------------------- */

/**
 * Check that the user has enough credit and the key hasn't exceeded its
 * monthly budget before calling upstream.
 */
export async function preflightCredit(
  userId: string,
  apiKeyId: string,
  apiKeyMonthlyBudget: bigint | null,
  apiKeyMonthlySpent: bigint,
  userCreditBalance: bigint,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (userCreditBalance <= 0n) {
    return {
      ok: false,
      status: 402,
      message: "Insufficient credit balance. Please top up to continue.",
    };
  }
  if (
    apiKeyMonthlyBudget != null &&
    apiKeyMonthlySpent >= apiKeyMonthlyBudget
  ) {
    return {
      ok: false,
      status: 429,
      message: "API key monthly budget exceeded.",
    };
  }
  return { ok: true };
}
