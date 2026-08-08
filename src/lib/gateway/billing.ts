import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  apiKeys,
  billingReservations,
  creditTransactions,
  usageLogs,
  users,
  type Model,
  type UsageStatus,
} from "@/lib/db/schema";
import { createId } from "@/lib/id";

type PricedModel = Pick<Model, "pricing">;
type ReservableBody = {
  messages?: unknown;
  system?: unknown;
  tools?: unknown;
  max_tokens?: number;
  max_completion_tokens?: number;
};
type ReservationMode = {
  model?: PricedModel;
  body?: ReservableBody;
  amountMicroUsd?: bigint;
};

export type BillingUsage = {
  modelId: string;
  modelPublicId: string;
  apiFormat: "openai" | "anthropic" | "images" | "audio" | "embedding" | "rerank";
  endpoint: string;
  streamed: boolean;
  promptTokens: number;
  completionTokens: number;
  /**
   * Prompt-cached tokens (read + write combined), as reported by the 9router
   * upstream. Billed at the single `per1MCached` rate.
   */
  cachedTokens?: number;
  status: UsageStatus;
  httpStatus: number;
  errorMessage?: string | null;
  latencyMs?: number | null;
  clientIp?: string | null;
  model: Model;
};

/**
 * Resolve the cached-token rate (USD per 1M cached tokens).
 *
 * Prefers the unified `per1MCached`; falls back to the legacy split rates so
 * models created before the unified field still bill their cached tokens.
 */
export function getCachedRatePer1M(
  pricing: Model["pricing"] | null | undefined,
): number {
  const p = pricing ?? {};
  return p.per1MCached ?? p.per1MCacheRead ?? p.per1MCacheWrite ?? 0;
}

export function monthStartUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function estimateInputTokens(body: ReservableBody): number {
  return Math.max(1, Math.ceil(JSON.stringify({
    messages: body.messages ?? [],
    system: body.system,
    tools: body.tools,
  }).length / 4));
}

export function validateReservationMode(params: ReservationMode): void {
  const estimated = params.model !== undefined && params.body !== undefined;
  const partialEstimated = (params.model !== undefined) !== (params.body !== undefined);
  const explicit = params.amountMicroUsd !== undefined;
  if (partialEstimated || estimated === explicit) {
    throw new TypeError("Provide exactly one reservation mode: model with body, or amountMicroUsd");
  }
}

export function computeReservationMicroUsd(
  params:
    | { model: PricedModel; body: ReservableBody; amountMicroUsd?: never }
    | { amountMicroUsd: bigint; model?: never; body?: never },
): bigint {
  if (params.amountMicroUsd !== undefined) {
    if (params.amountMicroUsd < 0n) throw new RangeError("Reservation amount must be non-negative");
    return params.amountMicroUsd;
  }
  const pricing = params.model.pricing ?? {};
  const inputTokens = estimateInputTokens(params.body);
  const outputTokens = Math.max(0, Math.ceil(
    params.body.max_completion_tokens ?? params.body.max_tokens ?? 0,
  ));
  // Conservative hold: assume the whole prompt could land in the cache bucket.
  return BigInt(Math.ceil(inputTokens * (pricing.per1MInput ?? 0)))
    + BigInt(Math.ceil(inputTokens * getCachedRatePer1M(pricing)))
    + BigInt(Math.ceil(outputTokens * (pricing.per1MOutput ?? 0)));
}

export function computeActualMicroUsd(params: {
  model: PricedModel;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
}): bigint {
  const pricing = params.model.pricing ?? {};
  // 9router reports `prompt_tokens` cache-inclusively (input + cached), so we
  // subtract the cached portion to bill the remainder at the input rate, and
  // bill all cached tokens at the single `per1MCached` rate.
  const cachedTokens = Math.max(0, params.cachedTokens ?? 0);
  const nonCachedInputTokens = Math.max(params.promptTokens - cachedTokens, 0);
  return BigInt(Math.round(nonCachedInputTokens * (pricing.per1MInput ?? 0)))
    + BigInt(Math.round(params.completionTokens * (pricing.per1MOutput ?? 0)))
    + BigInt(Math.round(cachedTokens * getCachedRatePer1M(pricing)));
}

export function computeSettledMonthlySpend(
  monthlySpent: bigint,
  reserved: bigint,
  actual: bigint,
  samePeriod = true,
): bigint {
  return samePeriod ? monthlySpent - reserved + actual : monthlySpent;
}

export function computeSettlement(params: {
  reserved: bigint;
  actual: bigint;
  availableBalance: bigint;
}): { balanceDelta: bigint; chargedMicroUsd: bigint; outstandingMicroUsd: bigint } {
  const extra = params.actual > params.reserved ? params.actual - params.reserved : 0n;
  const extraCharged = extra > params.availableBalance ? params.availableBalance : extra;
  const refund = params.reserved > params.actual ? params.reserved - params.actual : 0n;
  return {
    balanceDelta: refund - extraCharged,
    chargedMicroUsd: params.reserved - refund + extraCharged,
    outstandingMicroUsd: extra - extraCharged,
  };
}

export function leaseExpiry(now: Date, leaseMs: number): Date {
  return new Date(now.getTime() + leaseMs);
}

export function shouldReclaimLocked(
  expiresAt: Date,
  finalizedAt: Date | null,
  now: Date,
): boolean {
  return finalizedAt === null && expiresAt < now;
}

export function topUpLedgerAmounts(amount: bigint, debt: bigint): {
  topUp: bigint;
  debtOffset: bigint;
} {
  const allocation = allocateTopUp(amount, debt);
  return { topUp: allocation.credit, debtOffset: allocation.debtPayment };
}

export function allocateTopUp(amount: bigint, debt: bigint): {
  debtPayment: bigint;
  credit: bigint;
} {
  const debtPayment = amount < debt ? amount : debt;
  return { debtPayment, credit: amount - debtPayment };
}

export function createSettlementController<T>(settlePayload: (payload: T) => Promise<void>): {
  settle(payload: T): Promise<void>;
  canRelease(): boolean;
} {
  let payload: T | undefined;
  let started = false;
  let complete = false;
  let pending: Promise<void> | null = null;
  return {
    settle(nextPayload) {
      if (!started) {
        payload = nextPayload;
        started = true;
      }
      if (complete) return Promise.resolve();
      if (pending) return pending;
      pending = settlePayload(payload as T).then(
        () => { complete = true; pending = null; },
        (error) => { pending = null; throw error; },
      );
      return pending;
    },
    canRelease() {
      return !started;
    },
  };
}

export function createSharedSettlement(settle: () => Promise<void>): () => Promise<void> {
  let complete = false;
  let pending: Promise<void> | null = null;
  return () => {
    if (complete) return Promise.resolve();
    if (pending) return pending;
    pending = settle().then(
      () => { complete = true; pending = null; },
      (error) => { pending = null; throw error; },
    );
    return pending;
  };
}

export function computeSettlementDelta(reserved: bigint, actual: bigint): bigint {
  return reserved - actual;
}

// Reclaiming expired reservations runs at most once per interval across all
// requests (instead of on every preflight), to keep the hot path cheap.
const RECLAIM_INTERVAL_MS = 60_000;
let lastReclaimAt = 0;

async function reclaimExpiredReservations(now: Date): Promise<void> {
  const expired = await db.select({ id: billingReservations.id })
    .from(billingReservations)
    .where(and(isNull(billingReservations.finalizedAt), lt(billingReservations.expiresAt, now)))
    .limit(25);
  for (const { id } of expired) await settleReservation(id, 0n, null, now, true);
}

async function maybeReclaimExpiredReservations(now: Date): Promise<void> {
  const t = now.getTime();
  if (t - lastReclaimAt < RECLAIM_INTERVAL_MS) return;
  lastReclaimAt = t;
  try {
    await reclaimExpiredReservations(now);
  } catch (err) {
    // Reclaim is best-effort housekeeping; never fail the request because of it.
    lastReclaimAt = 0;
    console.error("[billing] reclaimExpiredReservations failed:", err);
  }
}

export async function preflightBilling(params: {
  userId: string;
  apiKeyId: string;
  model?: PricedModel;
  body?: ReservableBody;
  amountMicroUsd?: bigint;
}): Promise<
  | { ok: true; reservation: { id: string; amountMicroUsd: bigint; billingMonth: Date; expiresAt: Date } }
  | { ok: false; status: number; message: string }
> {
  validateReservationMode(params);
  const amount = params.amountMicroUsd === undefined
    ? computeReservationMicroUsd({ model: params.model!, body: params.body! })
    : computeReservationMicroUsd({ amountMicroUsd: params.amountMicroUsd });
  const now = new Date();
  await maybeReclaimExpiredReservations(now);
  const id = createId("res");
  const period = monthStartUtc(now);
  const expiresAt = leaseExpiry(now, 30 * 60_000);

  return db.transaction(async (tx) => {
    const [user] = await tx.execute<{ credit_balance: string; outstanding_balance: string }>(
      sql`select credit_balance, outstanding_balance from "user" where id = ${params.userId} for update`,
    );
    if (!user) return { ok: false as const, status: 402, message: "Insufficient credit balance. Please top up to continue." };
    const [key] = await tx.execute<{
      monthly_budget: string | null;
      monthly_spent: string;
      month_started_at: Date | null;
    }>(sql`select monthly_budget, monthly_spent, month_started_at from api_key where id = ${params.apiKeyId} and user_id = ${params.userId} for update`);
    if (!key) return { ok: false as const, status: 401, message: "Invalid API key." };

    if (BigInt(user.outstanding_balance) > 0n) {
      return { ok: false as const, status: 402, message: "Outstanding balance must be paid before making requests." };
    }
    const started = key.month_started_at ? new Date(key.month_started_at) : null;
    const monthlySpent = !started || started < period ? 0n : BigInt(key.monthly_spent);
    const budget = key.monthly_budget == null ? null : BigInt(key.monthly_budget);
    if (budget != null && monthlySpent + amount > budget) {
      return { ok: false as const, status: 429, message: "API key monthly budget exceeded." };
    }
    if (BigInt(user.credit_balance) < amount) {
      return { ok: false as const, status: 402, message: "Insufficient credit balance. Please top up to continue." };
    }

    await tx.update(users).set({ creditBalance: sql`${users.creditBalance} - ${amount}::bigint` }).where(eq(users.id, params.userId));
    await tx.update(apiKeys).set({
      monthlySpent: monthlySpent + amount,
      monthStartedAt: period,
      lastUsedAt: now,
    }).where(eq(apiKeys.id, params.apiKeyId));
    await tx.insert(billingReservations).values({
      id,
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      reservedMicroUsd: amount,
      billingMonth: period,
      expiresAt,
    });
    return { ok: true as const, reservation: { id, amountMicroUsd: amount, billingMonth: period, expiresAt } };
  });
}

async function settleReservation(
  reservationId: string,
  actual: bigint,
  usage: BillingUsage | null,
  now = new Date(),
  requireExpired = false,
): Promise<void> {
  const [locator] = await db.select({
    userId: billingReservations.userId,
    apiKeyId: billingReservations.apiKeyId,
  }).from(billingReservations).where(eq(billingReservations.id, reservationId)).limit(1);
  if (!locator) throw new Error("Billing reservation not found");

  await db.transaction(async (tx) => {
    const [user] = await tx.execute<{ credit_balance: string; outstanding_balance: string }>(
      sql`select credit_balance, outstanding_balance from "user" where id = ${locator.userId} for update`,
    );
    if (!user) throw new Error("Reservation user not found");
    const [key] = await tx.execute<{ monthly_spent: string; month_started_at: Date | null }>(
      sql`select monthly_spent, month_started_at from api_key where id = ${locator.apiKeyId} for update`,
    );
    if (!key) throw new Error("Reservation API key not found");
    const [reservation] = await tx.execute<{
      reserved_micro_usd: string;
      billing_month: Date;
      expires_at: Date;
      finalized_at: Date | null;
    }>(sql`select reserved_micro_usd, billing_month, expires_at, finalized_at from billing_reservation where id = ${reservationId} for update`);
    if (!reservation) throw new Error("Billing reservation not found");
    if (reservation.finalized_at) return;
    if (requireExpired && !shouldReclaimLocked(
      new Date(reservation.expires_at),
      reservation.finalized_at,
      now,
    )) return;

    const reserved = BigInt(reservation.reserved_micro_usd);
    const settlement = computeSettlement({
      reserved,
      actual,
      availableBalance: BigInt(user.credit_balance),
    });
    const usageLogId = usage ? createId("use") : null;
    const [updatedUser] = settlement.balanceDelta === 0n && settlement.outstandingMicroUsd === 0n
      ? [{ balance: BigInt(user.credit_balance) }]
      : await tx.update(users).set({
          creditBalance: sql`${users.creditBalance} + ${settlement.balanceDelta}::bigint`,
          outstandingBalance: sql`${users.outstandingBalance} + ${settlement.outstandingMicroUsd}::bigint`,
        }).where(eq(users.id, locator.userId)).returning({ balance: users.creditBalance });

    if (usage && usageLogId) {
      await tx.insert(usageLogs).values({
        id: usageLogId,
        userId: locator.userId,
        apiKeyId: locator.apiKeyId,
        modelId: usage.modelId,
        modelPublicId: usage.modelPublicId,
        apiFormat: usage.apiFormat,
        endpoint: usage.endpoint,
        streamed: usage.streamed,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.promptTokens + usage.completionTokens,
        costMicroUsd: actual,
        status: usage.status,
        httpStatus: usage.httpStatus,
        errorMessage: usage.errorMessage ?? null,
        latencyMs: usage.latencyMs ?? null,
        clientIp: usage.clientIp ?? null,
      });
    }

    const keyPeriod = key.month_started_at ? monthStartUtc(new Date(key.month_started_at)) : null;
    const reservationPeriod = monthStartUtc(new Date(reservation.billing_month));
    const samePeriod = keyPeriod?.getTime() === reservationPeriod.getTime();
    const monthlySpent = computeSettledMonthlySpend(
      BigInt(key.monthly_spent),
      reserved,
      actual,
      samePeriod,
    );
    await tx.update(apiKeys).set({ monthlySpent }).where(eq(apiKeys.id, locator.apiKeyId));

    if (settlement.balanceDelta !== 0n) {
      await tx.insert(creditTransactions).values({
        id: createId("ctx"),
        userId: locator.userId,
        type: settlement.balanceDelta > 0n ? "refund" : "deduction",
        amount: settlement.balanceDelta,
        balanceAfter: updatedUser.balance,
        note: `Settlement ${reservationId}`,
        usageLogId,
      });
    }
    await tx.update(billingReservations).set({
      actualMicroUsd: actual,
      chargedMicroUsd: settlement.chargedMicroUsd,
      outstandingMicroUsd: settlement.outstandingMicroUsd,
      usageLogId,
      finalizedAt: now,
    }).where(eq(billingReservations.id, reservationId));
  });
}

export async function extendBillingLease(
  reservationId: string,
  now = new Date(),
): Promise<void> {
  await db.update(billingReservations).set({
    expiresAt: leaseExpiry(now, 30 * 60_000),
  }).where(and(
    eq(billingReservations.id, reservationId),
    isNull(billingReservations.finalizedAt),
  ));
}

/**
 * Throttled lease extender for streaming responses.
 *
 * Streams can deliver hundreds of chunks; extending the lease on every chunk
 * would mean hundreds of DB writes per request. The lease is 30 minutes, so
 * extending at most once per `intervalMs` is more than enough headroom.
 */
export function createLeaseExtender(
  reservationId: string,
  intervalMs = 60_000,
): () => Promise<void> {
  let lastExtend = 0;
  let pending: Promise<void> | null = null;
  return () => {
    const now = Date.now();
    if (now - lastExtend < intervalMs) return Promise.resolve();
    lastExtend = now;
    if (pending) return pending;
    pending = extendBillingLease(reservationId, new Date(now)).then(
      () => { pending = null; },
      (error) => { pending = null; throw error; },
    );
    return pending;
  };
}

export async function finalizeBilling(
  reservationId: string,
  usage: BillingUsage,
  options?: { chargeReserved?: boolean; actualMicroUsd?: bigint },
): Promise<void> {
  let actual: bigint;
  if (options?.actualMicroUsd !== undefined) {
    actual = options.actualMicroUsd;
  } else if (options?.chargeReserved) {
    actual = await db.select({ amount: billingReservations.reservedMicroUsd })
      .from(billingReservations)
      .where(eq(billingReservations.id, reservationId))
      .limit(1)
      .then(([row]) => {
        if (!row) throw new Error("Billing reservation not found");
        return row.amount;
      });
  } else {
    actual = computeActualMicroUsd(usage);
  }
  if (actual < 0n) throw new RangeError("Actual amount must be non-negative");
  await settleReservation(reservationId, actual, usage);
}
