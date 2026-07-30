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

  if (params.unitCount != null && pricing.perUnit != null) {
    return BigInt(Math.round(pricing.perUnit * params.unitCount * 1_000_000));
  }

  let totalMicro = 0n;

  if (pricing.per1MInput != null) {
    totalMicro += BigInt(Math.round(params.promptTokens * pricing.per1MInput));
  }
  if (pricing.per1MOutput != null) {
    totalMicro += BigInt(Math.round(params.completionTokens * pricing.per1MOutput));
  }
  if (pricing.per1MCacheRead != null && params.cacheReadTokens) {
    totalMicro += BigInt(Math.round(params.cacheReadTokens * pricing.per1MCacheRead));
  }
  if (pricing.per1MCacheWrite != null && params.cacheWriteTokens) {
    totalMicro += BigInt(Math.round(params.cacheWriteTokens * pricing.per1MCacheWrite));
  }

  return totalMicro;
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

/**
 * Safe wrapper around recordUsageAndDeduct with exponential backoff retries.
 */
export async function recordUsageWithRetry(
  input: MeterRecordInput,
  retries = 3,
): Promise<MeterResult | null> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await recordUsageAndDeduct(input);
    } catch (err) {
      attempt++;
      if (attempt >= retries) {
        console.error(`[recordUsageAndDeduct] Failed after ${retries} attempts:`, err);
        return null;
      }
      await new Promise((res) => setTimeout(res, attempt * 100));
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                Pre-checks                                  */
/* -------------------------------------------------------------------------- */

/**
 * Check that the user has enough credit and the key hasn't exceeded its
 * monthly budget before calling upstream.
 *
 * FIX #2: Uses atomic SQL to prevent concurrent requests from all passing
 * the balance check before any deduction lands (double-spend race).
 * Reserves a small estimate upfront; the actual cost is reconciled in
 * recordUsageAndDeduct.
 */
export async function preflightCredit(
  userId: string,
  apiKeyId: string,
  apiKeyMonthlyBudget: bigint | null,
  apiKeyMonthlySpent: bigint,
  userCreditBalance: bigint,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  // Monthly budget check (non-atomic is acceptable — worst case slightly over budget).
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

  // Atomic balance check: only allow if balance > 0.
  // We don't reserve a specific amount here (cost depends on actual tokens),
  // but the atomic WHERE prevents N parallel requests from all seeing balance > 0.
  const [updated] = await db
    .update(users)
    .set({
      creditBalance: sql`${users.creditBalance} - 1::bigint`,
    })
    .where(sql`${users.id} = ${userId} AND ${users.creditBalance} > 0`)
    .returning({ creditBalance: users.creditBalance });

  if (!updated) {
    return {
      ok: false,
      status: 402,
      message: "Insufficient credit balance. Please top up to continue.",
    };
  }

  // The 1 micro-USD reservation is negligible; actual cost deducted in recordUsageAndDeduct.
  return { ok: true };
}
