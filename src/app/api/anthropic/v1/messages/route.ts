import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, extractApiKey } from "@/lib/gateway/api-key";
import { resolveModel } from "@/lib/gateway/model-resolver";
import type { Model } from "@/lib/db/schema";
import {
  enforceCapabilities,
  type OpenAIChatBody,
} from "@/lib/gateway/capability-enforcer";
import { createLeaseExtender, createSettlementController, finalizeBilling, preflightBilling } from "@/lib/gateway/billing";
import { callUpstream, callUpstreamStream } from "@/lib/gateway/openai";
import {
  ensureStreamUsage,
  extractUsageFromResponse,
} from "@/lib/gateway/openai";
import {
  anthropicToOpenAI,
  openAIToAnthropic,
  transformOpenAIStreamToAnthropic,
  type AnthropicBody,
} from "@/lib/gateway/anthropic";
import {
  anthropicErrorResponse,
  SSE_HEADERS,
  parseJsonBody,
  getClientIp,
  sseLine,
} from "@/lib/gateway/response";
import { anthropicRequestSchema } from "@/lib/gateway/validation";
import { internalErrorMessage, safeUpstreamMessage } from "@/lib/gateway/errors";

/* -------------------------------------------------------------------------- */
/*                      POST /api/anthropic/v1/messages                       */
/* -------------------------------------------------------------------------- */

// CORS preflight for browser-based agents (Cline webview, Claude Code web, SDKs
// using direct browser access). CLI clients ignore these headers.
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

export async function POST(request: NextRequest) {
  const startMs = Date.now();
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);
  let releaseReservation: (() => Promise<void>) | null = null;
  const billingState = { canRelease: true };

  // FIX #11: Wrap entire handler in try/catch to return proper Anthropic error JSON.
  try {
  // 1) Auth (same API key mechanism as OpenAI — x-api-key or Authorization)
  const raw =
    extractApiKey(request) ?? request.headers.get("x-api-key") ?? null;
  if (!raw) return anthropicErrorResponse(401, "Missing API key");
  const auth = await authenticateApiKey(raw);
  if (!auth.ok) return anthropicErrorResponse(auth.status, auth.message, auth.retryAfterSeconds ? { "Retry-After": String(auth.retryAfterSeconds) } : undefined);

  // 2) Parse body
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return anthropicErrorResponse(parsed.status, parsed.message);
  const validated = anthropicRequestSchema.safeParse(parsed.body);
  if (!validated.success) return anthropicErrorResponse(400, validated.error.issues[0]?.message ?? "Invalid request body");
  const aBody = validated.data as AnthropicBody;

  // Accept-header negotiation: some clients (e.g. Vercel AI SDK) send
  // stream:true but only accept application/json. Force non-streaming for them.
  const accept = request.headers.get("accept") ?? "";
  const wantsStream =
    aBody.stream === true &&
    !(accept.includes("application/json") && !accept.includes("text/event-stream"));

  // 3) Resolve model
  const resolved = await resolveModel(String(aBody.model));
  if (!resolved.ok) {
    return anthropicErrorResponse(resolved.status, resolved.message);
  }
  const model = resolved.model;

  // 4) Translate to OpenAI
  const openaiBody = anthropicToOpenAI(aBody);

  // 5) Capability enforcement
  const enforce = enforceCapabilities(openaiBody, model);
  if (enforce.kind === "rejected") {
    return anthropicErrorResponse(enforce.status, enforce.message);
  }

  // 6) Preflight credit/budget. Estimate from the translated OpenAI body: it
  // includes the injected max_tokens default (8192) that Anthropic clients
  // omitting max_tokens would otherwise leave unreserved, and the system
  // prompt folded into messages.
  const pre = await preflightBilling({
    userId: auth.user.id,
    apiKeyId: auth.apiKey.id,
    model,
    body: openaiBody,
  });
  if (!pre.ok) return anthropicErrorResponse(pre.status, pre.message);
  const reservationId = pre.reservation.id;
  releaseReservation = () => finalizeBilling(reservationId, {
    modelId: model.id,
    modelPublicId: model.publicId,
    apiFormat: "anthropic",
    endpoint: "messages",
    streamed: wantsStream,
    promptTokens: 0,
    completionTokens: 0,
    status: "error",
    httpStatus: 500,
    latencyMs: Date.now() - startMs,
    clientIp,
    model,
  }, { actualMicroUsd: 0n });

  // 7a) Canned response
  if (enforce.kind === "canned") {
    billingState.canRelease = false;
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: wantsStream,
      promptTokens: 0,
      completionTokens: Math.ceil(enforce.text.length / 4),
      status: "canned",
      httpStatus: 200,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }, { actualMicroUsd: 0n });
    if (wantsStream) {
      return new Response(
        cannedAnthropicStream(model.publicId, enforce.text),
        { status: 200, headers: SSE_HEADERS },
      );
    }
    return NextResponse.json(cannedAnthropicResponse(model.publicId, enforce.text));
  }

  // 7b) Forward
  const forwardBody: OpenAIChatBody = {
    ...(enforce.kind === "stripped" ? enforce.body : openaiBody),
    model: model.upstreamId,
    stream: wantsStream,
  };

  if (wantsStream) {
    return await handleStream({
      request,
      auth,
      model,
      body: forwardBody,
      modelPublicId: model.publicId,
      reservationId,
      billingState,
      requestId,
      startMs,
      clientIp,
    });
  }
  return await handleNonStream({
    request,
    auth,
    model,
    body: forwardBody,
    reservationId,
    billingState,
    requestId,
    startMs,
    clientIp,
  });
  } catch (err) {
    if (releaseReservation && billingState.canRelease) await releaseReservation();
    console.error(`[${requestId}] [POST /anthropic/v1/messages]`, err);
    return anthropicErrorResponse(500, internalErrorMessage(500), undefined, requestId);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function cannedAnthropicResponse(modelPublicId: string, text: string) {
  return {
    id: `msg_canned_${Date.now().toString(36)}`,
    type: "message",
    role: "assistant",
    model: modelPublicId,
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: Math.max(1, Math.ceil(text.length / 4)),
    },
  };
}

function cannedAnthropicStream(modelPublicId: string, text: string) {
  const encoder = new TextEncoder();
  const id = `msg_canned_${Date.now().toString(36)}`;
  const words = text.split(/(\s+)/);
  const outTokens = Math.max(1, Math.ceil(text.length / 4));

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          sseLine({
            type: "message_start",
            message: {
              id,
              type: "message",
              role: "assistant",
              content: [],
              model: modelPublicId,
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 0, output_tokens: 0 },
            },
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          sseLine({
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          }),
        ),
      );
      for (const w of words) {
        if (!w) continue;
        controller.enqueue(
          encoder.encode(
            sseLine({
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: w },
            }),
          ),
        );
        await new Promise((r) => setTimeout(r, 15));
      }
      controller.enqueue(
        encoder.encode(sseLine({ type: "content_block_stop", index: 0 })),
      );
      controller.enqueue(
        encoder.encode(
          sseLine({
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: outTokens },
          }),
        ),
      );
      controller.enqueue(encoder.encode(sseLine({ type: "message_stop" })));
      controller.close();
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                              Non-streaming                                 */
/* -------------------------------------------------------------------------- */

async function handleNonStream(params: {
  request: NextRequest;
  auth: Extract<Awaited<ReturnType<typeof authenticateApiKey>>, { ok: true }>;
  model: Model;
  body: OpenAIChatBody;
  reservationId: string;
  billingState: { canRelease: boolean };
  requestId: string;
  startMs: number;
  clientIp: string | null;
}) {
  const { request, model, body, reservationId, billingState, requestId, startMs, clientIp } = params;
  try {
    const upstream = await callUpstream({
      path: "/chat/completions",
      body,
      stream: false,
      signal: request.signal,
    });
    const usage = extractUsageFromResponse(upstream.json);

    billingState.canRelease = false;
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: false,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      status: upstream.status >= 200 && upstream.status < 300 ? "ok" : "error",
      httpStatus: upstream.status,
      errorMessage:
        upstream.status >= 400
          ? JSON.stringify(upstream.json).slice(0, 1000)
          : null,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    });

    if (upstream.status >= 400) {
      const safeMessage = safeUpstreamMessage(upstream.status, upstream.json);
      if (!safeMessage) console.error(`[${requestId}] [POST /anthropic/v1/messages upstream ${upstream.status}]`, upstream.json);
      return anthropicErrorResponse(upstream.status >= 500 || !safeMessage ? 502 : upstream.status, safeMessage ?? internalErrorMessage(502), undefined, safeMessage ? undefined : requestId);
    }

    const anthropicResp = openAIToAnthropic(
      upstream.json as Parameters<typeof openAIToAnthropic>[0],
    );
    return NextResponse.json(anthropicResp, {
      headers: { "X-Model-Resolved-To": model.upstreamId },
    });
  } catch (err) {
    if (!billingState.canRelease) {
      console.error(`[${requestId}] [POST /anthropic/v1/messages billing]`, err);
      return anthropicErrorResponse(500, internalErrorMessage(500), undefined, requestId);
    }
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: false,
      promptTokens: 0,
      completionTokens: 0,
      status: "error",
      httpStatus: 502,
      errorMessage: err instanceof Error ? err.message : "Upstream error",
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    });
    console.error(`[${requestId}] [POST /anthropic/v1/messages upstream]`, err);
    return anthropicErrorResponse(502, internalErrorMessage(502), undefined, requestId);
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Streaming                                  */
/* -------------------------------------------------------------------------- */

async function handleStream(params: {
  request: NextRequest;
  auth: Extract<Awaited<ReturnType<typeof authenticateApiKey>>, { ok: true }>;
  model: Model;
  body: OpenAIChatBody;
  modelPublicId: string;
  reservationId: string;
  billingState: { canRelease: boolean };
  requestId: string;
  startMs: number;
  clientIp: string | null;
}) {
  const { request, model, body, modelPublicId, reservationId, billingState, requestId, startMs, clientIp } = params;
  const streamBody = ensureStreamUsage(body);

  let upstream;
  try {
    upstream = await callUpstreamStream({
      path: "/chat/completions",
      body: streamBody,
      stream: true,
      signal: request.signal,
    });
  } catch (err) {
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: true,
      promptTokens: 0,
      completionTokens: 0,
      status: "error",
      httpStatus: 502,
      errorMessage: err instanceof Error ? err.message : "Upstream error",
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    });
    console.error(`[${requestId}] [POST /anthropic/v1/messages upstream stream]`, err);
    return anthropicErrorResponse(502, internalErrorMessage(502), undefined, requestId);
  }

  // Capture the final usage from the upstream OpenAI SSE for metering.
  let finalUsage = { promptTokens: 0, completionTokens: 0, cachedTokens: 0 };
  // Whether any content chunk was actually delivered. When the stream ends
  // without a usage report we only charge the reserved estimate if content was
  // delivered; an empty stream (early cancel, dead upstream) gets refunded —
  // same policy as /v1/chat/completions.
  let sawContent = false;
  const decoder = new TextDecoder();
  let sseAccum = "";
  // Throttled (60s) lease extension — per-chunk extension would issue a DB
  // write for every SSE chunk.
  const extendLease = createLeaseExtender(reservationId);

  const settlement = createSettlementController(async (usage: typeof finalUsage) => {
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: true,
      ...usage,
      status: "ok",
      httpStatus: 200,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }, { chargeReserved: usage.promptTokens === 0 && usage.completionTokens === 0 && sawContent });
  });
  const recordFinalUsage = () => {
    billingState.canRelease = false;
    return settlement.settle({ ...finalUsage });
  };

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      // Best-effort lease extension: a transient DB failure must not error the
      // client stream mid-generation.
      void extendLease().catch((err) =>
        console.error(`[${requestId}] [anthropic lease extension]`, err),
      );
      // Pass chunk through untouched, but also inspect for usage.
      try {
        // FIX #1: Use stream-safe decoder to handle multi-byte UTF-8 splits.
        sseAccum += decoder.decode(chunk, { stream: true });
        // FIX #16: Guard against unbounded buffer growth.
        if (sseAccum.length > 1_000_000) {
          sseAccum = sseAccum.slice(-100_000);
        }
        const events = sseAccum.split("\n\n");
        sseAccum = events.pop() ?? ""; // keep incomplete tail
        for (const ev of events) {
          const lines = ev.split("\n");
          const data: string[] = [];
          for (const l of lines) {
            if (l.startsWith("data:")) data.push(l.slice(5).trimStart());
          }
          if (!data.length) continue;
          const joined = data.join("\n");
          if (joined === "[DONE]") continue;
          try {
            const obj = JSON.parse(joined) as {
              choices?: unknown[];
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                prompt_tokens_details?: {
                  cached_tokens?: number;
                  cache_creation_tokens?: number;
                };
              };
            };
            // Content-bearing chunks have a non-empty `choices` array (the
            // final usage-only chunk has `choices: []`).
            if (Array.isArray(obj.choices) && obj.choices.length > 0) {
              sawContent = true;
            }
            if (obj.usage) {
              const details = obj.usage.prompt_tokens_details;
              finalUsage = {
                promptTokens: Number(obj.usage.prompt_tokens ?? 0) || 0,
                completionTokens: Number(obj.usage.completion_tokens ?? 0) || 0,
                // The upstream's "cached tokens" bucket = cache read + cache
                // write. Dropping this bills cached prompts at the full input
                // rate (systematic overcharge for cached agents).
                cachedTokens:
                  (Number(details?.cached_tokens ?? 0) || 0) +
                  (Number(details?.cache_creation_tokens ?? 0) || 0),
              };
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
      controller.enqueue(chunk);
    },
    async flush() {
      await recordFinalUsage();
    },
  });

  // FIX #12: Also record usage if client disconnects (cancel skips flush).
  request.signal.addEventListener("abort", () => {
    void recordFinalUsage().catch(console.error);
  }, { once: true });

  // Upstream (OpenAI SSE) -> transform to capture usage -> transform to Anthropic SSE
  const transformedReader = transformOpenAIStreamToAnthropic(
    upstream.stream.pipeThrough(transformStream),
    modelPublicId,
    request.signal,
  ).getReader();
  const anthropicStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await transformedReader.read();
        if (done) {
          await recordFinalUsage();
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        try {
          await recordFinalUsage();
        } catch (settlementError) {
          controller.error(settlementError);
          return;
        }
        controller.error(error);
      }
    },
    async cancel(reason) {
      const cancelUpstream = transformedReader.cancel(reason);
      await Promise.allSettled([cancelUpstream, recordFinalUsage()]).then((results) => {
        const settlementResult = results[1];
        if (settlementResult.status === "rejected") throw settlementResult.reason;
      });
    },
  });

  return new Response(anthropicStream, {
    status: 200,
    headers: {
      ...SSE_HEADERS,
      "X-Model-Resolved-To": model.upstreamId,
    },
  });
}
