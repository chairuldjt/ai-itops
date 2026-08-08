import { callUpstream, callUpstreamStream } from "./upstream";
import type { OpenAIChatBody, OpenAIMessage } from "./capability-enforcer";

/* -------------------------------------------------------------------------- */
/*                       SSE parser (upstream -> chunks)                      */
/* -------------------------------------------------------------------------- */

/**
 * Parse a ReadableStream<Uint8Array> of server-sent events from the
 * upstream, yielding parsed JSON objects (one per non-empty `data:` line).
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by "\n\n". Each event has one or more
      // "data:" lines. We only care about the data lines.
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const lines = rawEvent.split("\n");
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const joined = dataLines.join("\n");
        if (joined === "[DONE]") return;
        try {
          yield JSON.parse(joined);
        } catch {
          // Ignore unparseable chunks.
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                     Build a canned (fake) completion                       */
/* -------------------------------------------------------------------------- */

export interface CannedCompletionOpts {
  model: string;
  content: string;
  id?: string;
}

/**
 * Build a non-streaming OpenAI chat completion response body
 * with a static text message. Used for `canned_response` policy.
 */
export function buildCannedCompletionResponse(opts: CannedCompletionOpts) {
  const id = opts.id ?? `chatcmpl-canned-${Date.now().toString(36)}`;
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: opts.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: opts.content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: countCharsAsTokens(opts.content),
      total_tokens: countCharsAsTokens(opts.content),
    },
  };
}

/**
 * Build a ReadableStream that emits a canned completion as OpenAI SSE chunks,
 * followed by a usage chunk and `[DONE]`.
 */
export function buildCannedCompletionStream(
  opts: CannedCompletionOpts,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const id = opts.id ?? `chatcmpl-canned-${Date.now().toString(36)}`;
  const created = Math.floor(Date.now() / 1000);

  // Split content into ~20-char tokens to simulate streaming.
  const tokenChunks = splitIntoTokens(opts.content);
  const completionTokens = tokenChunks.length;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Header chunk (empty content)
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model: opts.model,
            choices: [
              {
                index: 0,
                delta: { role: "assistant", content: "" },
                finish_reason: null,
              },
            ],
          })}\n\n`,
        ),
      );

      for (const tok of tokenChunks) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id,
              object: "chat.completion.chunk",
              created,
              model: opts.model,
              choices: [
                { index: 0, delta: { content: tok }, finish_reason: null },
              ],
            })}\n\n`,
          ),
        );
        // simulate ~15ms between tokens
        await new Promise((r) => setTimeout(r, 15));
      }

      // Final usage chunk (OpenAI uses `stream_options.include_usage`)
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model: opts.model,
            choices: [
              { index: 0, delta: {}, finish_reason: "stop" },
            ],
            usage: {
              prompt_tokens: 0,
              completion_tokens: completionTokens,
              total_tokens: completionTokens,
            },
          })}\n\n`,
        ),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                              Helpers                                       */
/* -------------------------------------------------------------------------- */

/**
 * Inject `stream_options.include_usage: true` into a streaming body so that
 * the upstream returns a final chunk with usage stats. This is the standard
 * OpenAI mechanism for getting token counts from a stream.
 */
export function ensureStreamUsage(body: OpenAIChatBody): OpenAIChatBody {
  return {
    ...body,
    stream: true,
    stream_options: {
      ...((body.stream_options as Record<string, unknown>) ?? {}),
      include_usage: true,
    },
  };
}

/**
 * Count the last assistant content in a non-streaming response, or return 0.
 * Upstream usually returns a proper `usage` field; this is a fallback.
 *
 * Cached tokens: 9router reports prompt-cache tokens in `prompt_tokens_details`
 * (`cached_tokens` = read, `cache_creation_tokens` = write) and treats them as
 * one "cached tokens" bucket. We combine read + write into `cachedTokens`.
 */
export function extractUsageFromResponse(json: unknown): {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
} {
  if (!json || typeof json !== "object") {
    return { promptTokens: 0, completionTokens: 0, cachedTokens: 0 };
  }
  const usage = (json as { usage?: Record<string, unknown> }).usage;
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0, cachedTokens: 0 };
  }
  const u = usage as Record<string, unknown>;
  const promptDetails = (u.prompt_tokens_details ?? {}) as Record<string, unknown>;
  const cacheRead =
    Number(promptDetails.cached_tokens ?? u.cache_read_input_tokens ?? 0) || 0;
  const cacheWrite =
    Number(
      promptDetails.cache_creation_tokens ?? u.cache_creation_input_tokens ?? 0,
    ) || 0;
  return {
    promptTokens: Number(u.prompt_tokens ?? 0) || 0,
    completionTokens: Number(u.completion_tokens ?? 0) || 0,
    cachedTokens: cacheRead + cacheWrite,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  utils                                     */
/* -------------------------------------------------------------------------- */

function countCharsAsTokens(text: string): number {
  // Very rough estimate: ~4 chars per token
  return Math.max(1, Math.ceil(text.length / 4));
}

function splitIntoTokens(text: string): string[] {
  const out: string[] = [];
  // Split on whitespace boundaries, ~2-4 words per token
  const words = text.split(/(\s+)/);
  let acc = "";
  for (const w of words) {
    if ((acc + w).length > 20 && acc) {
      out.push(acc);
      acc = w;
    } else {
      acc += w;
    }
  }
  if (acc) out.push(acc);
  return out;
}

// Re-export upstream helpers for the route handler's convenience.
export { callUpstream, callUpstreamStream };
export type { OpenAIChatBody, OpenAIMessage };
