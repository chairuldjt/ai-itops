import { NextResponse } from "next/server";

/**
 * Build an OpenAI-style error response body.
 * { error: { message, type, code } }
 */
export function openaiErrorBody(
  status: number,
  message: string,
  code?: string,
  type?: string,
) {
  return {
    error: {
      message,
      type: type ?? typeForStatus(status),
      code: code ?? codeForStatus(status),
    },
  };
}

export function openaiErrorResponse(
  status: number,
  message: string,
  code?: string,
): NextResponse {
  return NextResponse.json(openaiErrorBody(status, message, code), {
    status,
    headers: errorHeaders(),
  });
}

/**
 * Build an Anthropic-style error response body.
 * { type: "error", error: { type, message } }
 */
export function anthropicErrorBody(status: number, message: string) {
  return {
    type: "error",
    error: {
      type: typeForStatus(status),
      message,
    },
  };
}

export function anthropicErrorResponse(
  status: number,
  message: string,
): NextResponse {
  return NextResponse.json(anthropicErrorBody(status, message), {
    status,
    headers: errorHeaders(),
  });
}

/* -------------------------------------------------------------------------- */
/*                              Stream helpers                                */
/* -------------------------------------------------------------------------- */

/**
 * Emit a single SSE "data: ..." line followed by a blank line.
 */
export function sseLine(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export function errorHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

/* -------------------------------------------------------------------------- */
/*                                  utils                                     */
/* -------------------------------------------------------------------------- */

function typeForStatus(status: number): string {
  if (status === 400) return "invalid_request_error";
  if (status === 401) return "authentication_error";
  if (status === 402) return "billing_error";
  if (status === 403) return "permission_error";
  if (status === 404) return "not_found_error";
  if (status === 408) return "timeout_error";
  if (status === 429) return "rate_limit_error";
  return "internal_error";
}

function codeForStatus(status: number): string {
  if (status === 400) return "invalid_request";
  if (status === 401) return "invalid_api_key";
  if (status === 402) return "insufficient_balance";
  if (status === 403) return "forbidden";
  if (status === 404) return "model_not_found";
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limit_exceeded";
  return "server_error";
}

/**
 * Safely parse JSON from a request body.
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
): Promise<{ ok: true; body: T } | { ok: false; message: string }> {
  try {
    const body = (await request.json()) as T;
    return { ok: true, body };
  } catch {
    return { ok: false, message: "Invalid JSON body" };
  }
}

/**
 * Read an IP address from common proxy headers.
 */
export function getClientIp(request: Request): string | null {
  const h = request.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    null
  );
}
