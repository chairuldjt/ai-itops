import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * POST /api/anthropic/v1/messages/count_tokens
 *
 * Claude Code calls this to estimate prompt size. We return a rough estimate
 * (≈4 chars per token) like 9router's mock endpoint. No auth required.
 */
export async function POST(request: NextRequest) {
  let totalChars = 0;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    totalChars = countChars(body);
  } catch {
    totalChars = 0;
  }
  return NextResponse.json({
    input_tokens: Math.max(1, Math.ceil(totalChars / 4)),
  });
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
