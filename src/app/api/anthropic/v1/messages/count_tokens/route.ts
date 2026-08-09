import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/gateway/response";

/** CORS preflight for browser-based agents. */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * POST /api/anthropic/v1/messages/count_tokens
 *
 * Claude Code calls this to estimate prompt size. We return a rough estimate
 * (≈4 chars per token) like 9router's mock endpoint. No auth required.
 *
 * The body is read through parseJsonBody so this unauthenticated endpoint
 * enforces the same size cap (32 MB) as the gateway routes — a raw
 * request.json() would let anyone stream multi-GB payloads into memory.
 */
export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { type: "invalid_request_error", message: parsed.message } },
      { status: parsed.status, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
  const totalChars = countChars(parsed.body);
  return NextResponse.json(
    { input_tokens: Math.max(1, Math.ceil(totalChars / 4)) },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

/** Recursively sum string lengths of a JSON-ish value (bounded depth). */
function countChars(value: unknown, depth = 0): number {
  if (depth > 14) return 0;
  if (typeof value === "string") return value.length;
  if (value == null || typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    let n = 0;
    for (const item of value) n += countChars(item, depth + 1);
    return n;
  }
  let n = 0;
  for (const item of Object.values(value)) n += countChars(item, depth + 1);
  return n;
}
