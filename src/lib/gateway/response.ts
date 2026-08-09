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
  headers?: Record<string, string>,
  requestId?: string,
): NextResponse {
  const body = openaiErrorBody(status, message, code) as ReturnType<typeof openaiErrorBody> & { request_id?: string };
  if (requestId) body.request_id = requestId;
  return NextResponse.json(body, {
    status,
    headers: { ...errorHeaders(), ...headers, ...(requestId ? { "X-Request-ID": requestId, "request-id": requestId } : {}) },
  });
}

/* -------------------------------------------------------------------------- */
/*                              Stream helpers                                */
/* -------------------------------------------------------------------------- */

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
  headers?: Record<string, string>,
  requestId?: string,
): NextResponse {
  const body = anthropicErrorBody(status, message) as ReturnType<typeof anthropicErrorBody> & { request_id?: string };
  if (requestId) body.request_id = requestId;
  return NextResponse.json(body, {
    status,
    headers: { ...errorHeaders(), "Access-Control-Allow-Origin": "*", ...headers, ...(requestId ? { "X-Request-ID": requestId, "request-id": requestId } : {}) },
  });
}

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
  // Browser-based agents (Cline webview, Claude Code web, direct-browser SDKs)
  // need CORS on streamed responses. Harmless for CLI clients.
  "Access-Control-Allow-Origin": "*",
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
 *
 * Claude Code sends large requests (long conversations, many tools, base64
 * images), so the cap is generous. Per-key rate limits still bound abuse.
 */
export const MAX_JSON_BODY_BYTES = 33_554_432; // 32 MB

export async function parseJsonBody<T = unknown>(
  request: Request,
): Promise<{ ok: true; body: T } | { ok: false; status: 400 | 413; message: string }> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_JSON_BODY_BYTES) {
    return { ok: false, status: 413, message: "Request body too large" };
  }
  if (!request.body) return { ok: false, status: 400, message: "Invalid JSON body" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, message: "Request body too large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON body" };
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
