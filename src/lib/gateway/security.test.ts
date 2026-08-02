import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { extractApiKey, apiKeyAccessDecision, normalizeRpmLimit } from "./api-key";
import { anthropicErrorResponse, MAX_JSON_BODY_BYTES, openaiErrorResponse, parseJsonBody } from "./response";
import { getClient } from "../db";
import { consumeRateLimit } from "./rate-limit";
import { anthropicRequestSchema, openAIChatRequestSchema } from "./validation";
import { safeUpstreamMessage, internalErrorMessage } from "./errors";
import { tokenBucketState } from "./rate-limit";

test("extractApiKey accepts only Authorization Bearer", () => {
  assert.equal(extractApiKey(new Request("https://example.test/?api_key=query")), null);
  assert.equal(extractApiKey(new Request("https://example.test", { headers: { Authorization: "Basic abc" } })), null);
  assert.equal(extractApiKey(new Request("https://example.test", { headers: { Authorization: "Bearer secret" } })), "secret");
});

test("RPM limit accepts PostgreSQL integer values up to product ceiling", () => {
  assert.equal(normalizeRpmLimit(1), 1);
  assert.equal(normalizeRpmLimit(1_000_000), 1_000_000);
  assert.equal(normalizeRpmLimit(0), null);
  assert.equal(normalizeRpmLimit(1_000_001), null);
  assert.equal(normalizeRpmLimit(2_147_483_648), null);
  assert.equal(normalizeRpmLimit(1.5), null);
});

test("API key expiry boundary and temporary ban decisions", () => {
  const now = new Date("2026-08-01T00:00:00Z");
  assert.equal(apiKeyAccessDecision({ enabled: true, expiresAt: now }, { banned: false, banExpires: null }, now).ok, false);
  assert.equal(apiKeyAccessDecision({ enabled: true, expiresAt: null }, { banned: true, banExpires: new Date(now.getTime() - 1) }, now).ok, true);
  assert.equal(apiKeyAccessDecision({ enabled: true, expiresAt: null }, { banned: true, banExpires: null }, now).ok, false);
  assert.equal(apiKeyAccessDecision({ enabled: true, expiresAt: null }, { banned: true, banExpires: new Date(now.getTime() + 1) }, now).ok, false);
});

test("bounded JSON reader distinguishes invalid and oversized bodies", async () => {
  const invalid = await parseJsonBody(new Request("https://example.test", { method: "POST", body: "{" }));
  assert.deepEqual(invalid, { ok: false, status: 400, message: "Invalid JSON body" });
  const declared = await parseJsonBody(new Request("https://example.test", { method: "POST", headers: { "content-length": String(MAX_JSON_BODY_BYTES + 1) }, body: "{}" }));
  assert.equal(declared.ok, false);
  if (!declared.ok) assert.equal(declared.status, 413);
  const chunk = new Uint8Array(600_000);
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(chunk); controller.enqueue(chunk); controller.close(); } });
  const chunked = await parseJsonBody(new Request("https://example.test", { method: "POST", body: stream, duplex: "half" } as RequestInit));
  assert.equal(chunked.ok, false);
  if (!chunked.ok) assert.equal(chunked.status, 413);
});

test("OpenAI schema validates trust-boundary shape and bounds", () => {
  assert.equal(openAIChatRequestSchema.safeParse({ model: "", messages: [] }).success, false);
  assert.equal(openAIChatRequestSchema.safeParse({ model: "m", messages: [{ role: "bad", content: "x" }] }).success, false);
  assert.equal(openAIChatRequestSchema.safeParse({ model: "m", messages: [{ role: "user", content: "x" }], temperature: Infinity }).success, false);
  assert.equal(openAIChatRequestSchema.safeParse({ model: "m", messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "x".repeat(300_000) } }] }] }).success, false);
  assert.equal(openAIChatRequestSchema.safeParse({ model: "m", messages: [{ role: "user", content: "x" }], unknown_safe: true }).success, true);
  assert.equal(openAIChatRequestSchema.safeParse({ model: "m", messages: [{ role: "assistant", content: [{ type: "refusal", refusal: "no" }] }] }).success, true);
  const tooDeep = { type: "future", nested: { a: { b: { c: { d: { e: 1 } } } } } };
  assert.equal(openAIChatRequestSchema.safeParse({ model: "m", messages: [{ role: "user", content: [tooDeep] }] }).success, false);
});

test("Anthropic schema requires max_tokens and bounds tools/base64", () => {
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", messages: [{ role: "user", content: "x" }] }).success, false);
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", max_tokens: 0, messages: [{ role: "user", content: "x" }] }).success, false);
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", max_tokens: 10, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "x".repeat(800_000) } }] }] }).success, false);
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", max_tokens: 10, messages: [{ role: "user", content: "x" }], extra: true }).success, true);
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", max_tokens: 10, messages: [{ role: "assistant", content: [{ type: "thinking", thinking: "x", signature: "s" }, { type: "redacted_thinking", data: "x" }] }] }).success, true);
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", max_tokens: 10, messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: "x" } }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: [{ type: "future", value: "x" }] }] }] }).success, true);
  assert.equal(anthropicRequestSchema.safeParse({ model: "m", max_tokens: 10, messages: [{ role: "user", content: [{ type: "future", payload: "x".repeat(250_000) }] }] }).success, false);
});

test("upstream message allowlist passes only structured safe 4xx", () => {
  assert.equal(internalErrorMessage(500), "Internal server error");
  assert.equal(internalErrorMessage(502), "Upstream service error");
  assert.equal(safeUpstreamMessage(400, { error: { type: "invalid_request_error", message: "model is required" } }), "model is required");
  assert.equal(safeUpstreamMessage(401, { error: { type: "authentication_error", message: "invalid token" } }), "invalid token");
  assert.equal(safeUpstreamMessage(400, { error: { message: "postgres://secret" } }), null);
  assert.equal(safeUpstreamMessage(404, { error: { type: "internal_error", message: "raw" } }), null);
  assert.equal(safeUpstreamMessage(500, { error: { type: "invalid_request_error", message: "raw" } }), null);
});

test("token bucket prevents boundary burst and refills continuously", () => {
  const first = tokenBucketState(10, 10, 0, 59_999);
  assert.equal(first.allowed, true);
  const empty = tokenBucketState(0, 10, 59_999, 60_001);
  assert.equal(empty.allowed, false);
  assert.equal(empty.retryAfterSeconds, 6);
  const refilled = tokenBucketState(0, 10, 0, 30_000);
  assert.equal(refilled.allowed, true);
  assert.equal(refilled.tokens, 4);
});

test("internal OpenAI errors expose matching request ID in body and header", async () => {
  const response = openaiErrorResponse(502, internalErrorMessage(502), undefined, undefined, "req-test");
  assert.equal(response.headers.get("x-request-id"), "req-test");
  assert.equal(response.headers.get("request-id"), "req-test");
  assert.equal((await response.json()).request_id, "req-test");
});

test("Anthropic errors expose matching request ID in body and both headers", async () => {
  const response = anthropicErrorResponse(502, internalErrorMessage(502), undefined, "req-anthropic");
  assert.equal(response.headers.get("x-request-id"), "req-anthropic");
  assert.equal(response.headers.get("request-id"), "req-anthropic");
  assert.equal((await response.json()).request_id, "req-anthropic");
});

test("PostgreSQL token bucket is atomic across boundary and refill", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be loaded for integration test");
  const sql = getClient();
  const suffix = crypto.randomUUID();
  const userId = `security-test-user-${suffix}`;
  const apiKeyId = `security-test-key-${suffix}`;
  const now = new Date("2099-01-01T00:00:01Z");
  try {
    await sql`insert into "user" (id, name, email) values (${userId}, 'Security Test', ${`${suffix}@example.invalid`})`;
    await sql`insert into api_key (id, user_id, name, key_hash, key_prefix) values (${apiKeyId}, ${userId}, 'Security Test', ${suffix.replaceAll("-", "")}, 'test')`;
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit(apiKeyId, 10, now)));
    assert.equal(results.filter((result) => result.allowed).length, 10);
    const boundary = await Promise.all(Array.from({ length: 10 }, () => consumeRateLimit(apiKeyId, 10, new Date(now.getTime() + 1))));
    assert.equal(boundary.filter((result) => result.allowed).length, 0);
    const refill = await Promise.all(Array.from({ length: 2 }, () => consumeRateLimit(apiKeyId, 10, new Date(now.getTime() + 6_000))));
    assert.equal(refill.filter((result) => result.allowed).length, 1);
    const rows = await sql`select tokens from api_rate_limit_bucket where api_key_id = ${apiKeyId}`;
    assert.equal(rows.length, 1);
  } finally {
    await sql`delete from "user" where id = ${userId}`;
  }
});
