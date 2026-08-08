import assert from "node:assert/strict";
import test from "node:test";

import {
  computeActualMicroUsd,
  computeReservationMicroUsd,
  computeSettlement,
  computeSettledMonthlySpend,
  computeSettlementDelta,
  allocateTopUp,
  createSettlementController,
  createSharedSettlement,
  getCachedRatePer1M,
  leaseExpiry,
  monthStartUtc,
  shouldReclaimLocked,
  topUpLedgerAmounts,
  validateReservationMode,
} from "./billing";

const model = {
  pricing: {
    per1MInput: 3,
    per1MOutput: 15,
  },
};

test("monthStartUtc returns UTC monthly boundary", () => {
  assert.deepEqual(
    monthStartUtc(new Date("2026-08-31T23:59:59.000Z")),
    new Date("2026-08-01T00:00:00.000Z"),
  );
});

test("computeReservationMicroUsd reserves estimated input and maximum output", () => {
  assert.equal(
    computeReservationMicroUsd({ model, body: { messages: ["12345678"], max_tokens: 10 } }),
    171n,
  );
});

test("computeSettledMonthlySpend replaces reservation with actual", () => {
  assert.equal(computeSettledMonthlySpend(500n, 200n, 125n), 425n);
});

test("computeSettlementDelta refunds unused reservation", () => {
  assert.equal(computeSettlementDelta(159n, 60n), 99n);
});

test("computeSettlementDelta charges excess actual cost", () => {
  assert.equal(computeSettlementDelta(100n, 125n), -25n);
});

test("computeActualMicroUsd charges cached prompt tokens exactly once", () => {
  // prompt is cache-inclusive (9router): 10 = 5 non-cached + 5 cached.
  assert.equal(
    computeActualMicroUsd({
      model: {
        pricing: {
          per1MInput: 3,
          per1MOutput: 15,
          per1MCached: 2,
        },
      },
      promptTokens: 10,
      completionTokens: 5,
      cachedTokens: 5,
    }),
    100n,
  );
});

test("computeActualMicroUsd falls back to legacy split cache rates", () => {
  // Legacy rows without per1MCached still bill cached tokens (read rate).
  assert.equal(
    computeActualMicroUsd({
      model: { pricing: { per1MInput: 3, per1MCacheRead: 1, per1MCacheWrite: 4 } },
      promptTokens: 10,
      completionTokens: 0,
      cachedTokens: 5,
    }),
    20n, // (10-5)*3 + 5*1
  );
});

test("computeActualMicroUsd clamps cached prompt tokens to prompt total", () => {
  assert.equal(
    computeActualMicroUsd({
      model: { pricing: { per1MInput: 3, per1MCached: 1 } },
      promptTokens: 2,
      completionTokens: 0,
      cachedTokens: 5,
    }),
    5n,
  );
});

test("getCachedRatePer1M prefers unified rate then legacy read/write", () => {
  assert.equal(getCachedRatePer1M({ per1MCached: 2, per1MCacheRead: 1 }), 2);
  assert.equal(getCachedRatePer1M({ per1MCacheRead: 1, per1MCacheWrite: 4 }), 1);
  assert.equal(getCachedRatePer1M({ per1MCacheWrite: 4 }), 4);
  assert.equal(getCachedRatePer1M({}), 0);
  assert.equal(getCachedRatePer1M(null), 0);
});

test("computeReservationMicroUsd rejects negative explicit amount", () => {
  assert.throws(
    () => computeReservationMicroUsd({ amountMicroUsd: -1n }),
    /non-negative/,
  );
});

test("computeReservationMicroUsd reserves cached tokens conservatively", () => {
  assert.equal(
    computeReservationMicroUsd({
      model: { pricing: { per1MInput: 3, per1MOutput: 15, per1MCached: 4 } },
      body: { messages: [{ content: [{ type: "image_url", image_url: { url: "data:image/png;base64,12345678" } }] }], max_tokens: 0 },
    }),
    182n,
  );
});

test("validateReservationMode requires exactly model and body or amount", () => {
  assert.throws(() => validateReservationMode({}), /exactly one/);
  assert.throws(
    () => validateReservationMode({ model, body: { messages: [] }, amountMicroUsd: 1n }),
    /exactly one/,
  );
  assert.doesNotThrow(() => validateReservationMode({ model, body: { messages: [] } }));
  assert.doesNotThrow(() => validateReservationMode({ amountMicroUsd: 1n }));
});

test("computeSettledMonthlySpend does not subtract prior-month reservation", () => {
  assert.equal(
    computeSettledMonthlySpend(50n, 200n, 125n, false),
    50n,
  );
});

test("computeSettlement caps extra deduction and preserves outstanding actual", () => {
  assert.deepEqual(
    computeSettlement({ reserved: 100n, actual: 175n, availableBalance: 25n }),
    { balanceDelta: -25n, chargedMicroUsd: 125n, outstandingMicroUsd: 50n },
  );
});

test("computeSettlement avoids zero ledger amount", () => {
  assert.deepEqual(
    computeSettlement({ reserved: 100n, actual: 100n, availableBalance: 25n }),
    { balanceDelta: 0n, chargedMicroUsd: 100n, outstandingMicroUsd: 0n },
  );
});

test("createSharedSettlement shares concurrent work and retries after rejection", async () => {
  let calls = 0;
  const settle = createSharedSettlement(async () => {
    calls++;
    if (calls === 1) throw new Error("transient");
  });
  const first = settle();
  assert.equal(first, settle());
  await assert.rejects(first, /transient/);
  await settle();
  assert.equal(calls, 2);
});

test("settlement controller preserves first real payload across retries", async () => {
  const payloads: number[] = [];
  const controller = createSettlementController(async (payload: number) => {
    payloads.push(payload);
    if (payloads.length === 1) throw new Error("db down");
  });
  await assert.rejects(controller.settle(42), /db down/);
  assert.equal(controller.canRelease(), false);
  await controller.settle(0);
  assert.deepEqual(payloads, [42, 42]);
});

test("leaseExpiry extends from heartbeat time", () => {
  assert.deepEqual(
    leaseExpiry(new Date("2026-08-01T00:00:00Z"), 30 * 60_000),
    new Date("2026-08-01T00:30:00Z"),
  );
});

test("allocateTopUp pays debt before credit balance", () => {
  assert.deepEqual(allocateTopUp(100n, 40n), { debtPayment: 40n, credit: 60n });
  assert.deepEqual(allocateTopUp(25n, 40n), { debtPayment: 25n, credit: 0n });
});

test("locked reclaim only proceeds when lease remains expired", () => {
  const now = new Date("2026-08-01T01:00:00Z");
  assert.equal(shouldReclaimLocked(new Date("2026-08-01T00:59:59Z"), null, now), true);
  assert.equal(shouldReclaimLocked(new Date("2026-08-01T01:30:00Z"), null, now), false);
  assert.equal(shouldReclaimLocked(new Date("2026-08-01T00:59:59Z"), now, now), false);
});

test("top-up ledger records only net credit balance increase", () => {
  assert.deepEqual(topUpLedgerAmounts(100n, 40n), { topUp: 60n, debtOffset: 40n });
  assert.deepEqual(topUpLedgerAmounts(25n, 40n), { topUp: 0n, debtOffset: 25n });
});
