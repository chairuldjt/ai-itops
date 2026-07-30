/**
 * Upstream client for 9router (OpenAI-compatible).
 *
 * Responsibilities:
 *  - Forward a prepared body to the configured upstream base URL
 *  - Pass the upstream `Authorization: Bearer <UPSTREAM_API_KEY>` header
 *  - Stream or buffer the response
 *  - Surface upstream errors as structured errors
 */

export interface UpstreamRequest {
  /** Full upstream path, e.g. "/chat/completions" */
  path: string;
  /** JSON body */
  body: unknown;
  /** Whether the client requested streaming */
  stream: boolean;
  /** Optional AbortSignal for cancellation */
  signal?: AbortSignal;
  /** HTTP method, defaults to POST */
  method?: "POST" | "GET";
}

export interface UpstreamNonStreamResponse {
  status: number;
  headers: Headers;
  json: unknown;
}

export interface UpstreamStreamResponse {
  status: number;
  headers: Headers;
  stream: ReadableStream<Uint8Array>;
}

function getUpstreamConfig() {
  const base = process.env.UPSTREAM_BASE_URL;
  if (!base) {
    throw new Error("UPSTREAM_BASE_URL is not configured");
  }
  const key = process.env.UPSTREAM_API_KEY ?? "";
  const timeout = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 120_000);
  return { base: base.replace(/\/+$/, ""), key, timeout };
}

/**
 * Call the upstream and buffer the JSON response.
 */
export async function callUpstream(
  req: UpstreamRequest,
): Promise<UpstreamNonStreamResponse> {
  const { base, key, timeout } = getUpstreamConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const mergedSignal = mergeSignals(controller.signal, req.signal);

  try {
    const res = await fetch(`${base}${req.path}`, {
      method: req.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        Accept: "application/json",
      },
      body: req.body == null ? undefined : JSON.stringify(req.body),
      signal: mergedSignal,
    });

    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    return { status: res.status, headers: res.headers, json };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call the upstream in streaming mode. Returns the raw upstream ReadableStream
 * of SSE chunks (UTF-8).
 */
export async function callUpstreamStream(
  req: UpstreamRequest,
): Promise<UpstreamStreamResponse> {
  const { base, key, timeout } = getUpstreamConfig();
  const controller = new AbortController();
  // FIX #6: Timeout is for time-to-first-byte, not the full stream.
  const timer = setTimeout(() => controller.abort(), timeout);
  const mergedSignal = mergeSignals(controller.signal, req.signal);

  // FIX #13: Wrap in try/catch to clear timer if fetch throws before response.
  let res: Response;
  try {
    res = await fetch(`${base}${req.path}`, {
      method: req.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(req.body),
      signal: mergedSignal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }

  if (!res.ok || !res.body) {
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    throw new UpstreamError(res.status, text || res.statusText);
  }

  // FIX #6: Clear TTFB timeout now that we have response headers.
  // Long-running streams won't be killed by the TTFB timer.
  clearTimeout(timer);

  const wrapped = wrapStream(res.body, () => {});
  return { status: res.status, headers: res.headers, stream: wrapped };
}

export class UpstreamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`Upstream ${status}: ${message}`);
    this.status = status;
    this.name = "UpstreamError";
  }
}

/* -------------------------------------------------------------------------- */
/*                                   utils                                    */
/* -------------------------------------------------------------------------- */

function mergeSignals(a: AbortSignal, b?: AbortSignal): AbortSignal {
  if (!b) return a;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

function wrapStream(
  input: ReadableStream<Uint8Array>,
  onCancel: () => void,
): ReadableStream<Uint8Array> {
  const reader = input.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          onCancel();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        onCancel();
        controller.error(err);
      }
    },
    cancel(reason) {
      onCancel();
      return reader.cancel(reason);
    },
  });
}
