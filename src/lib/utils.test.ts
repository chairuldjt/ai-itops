import assert from "node:assert/strict";
import test from "node:test";

import { formatNumber } from "./utils";

test("formatNumber formats plain numbers with dot separators", () => {
  assert.equal(formatNumber(0), "0");
  assert.equal(formatNumber(447), "447");
  assert.equal(formatNumber(1234567), "1.234.567");
  assert.equal(formatNumber(-1234), "-1.234");
});

test("formatNumber coerces string aggregates (Postgres bigint comes back as string)", () => {
  // The dashboard "always zero" regression: count(*)/sum() return bigint, the
  // driver serializes it as a string, and Number.isFinite("2") === false.
  assert.equal(formatNumber("2"), "2");
  assert.equal(formatNumber("447"), "447");
  assert.equal(formatNumber("194253"), "194.253");
});

test("formatNumber handles bigint, null, undefined and garbage as zero-safe", () => {
  assert.equal(formatNumber(447n), "447");
  assert.equal(formatNumber(null), "0");
  assert.equal(formatNumber(undefined), "0");
  assert.equal(formatNumber("not-a-number"), "0");
  assert.equal(formatNumber(Number.NaN), "0");
});
