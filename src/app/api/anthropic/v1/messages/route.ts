import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, extractApiKey } from "@/lib/gateway/api-key";
import { resolveModel } from "@/lib/gateway/model-resolver";
import type { Model } from "@/lib/db/schema";
import {
  enforceCapabilities,
  type OpenAIChatBody,
} from "@/lib/gateway/capability-enforcer";
import { preflightCredit, recordUsageAndDeduct } from "@/lib/gateway/meter";
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

/* -------------------------------------------------------------------------- */
/*                      POST /api/anthropic/v1/messages                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  const startMs = Date.now();
  const clientIp = getClientIp(request);

  // FIX #11: Wrap entire handler in try/catch to return proper Anthropic error JSON.
  try {
  // 1) Auth (same API key mechanism as OpenAI — x-api-key or Authorization)
  const raw =
    extractApiKey(request) ?? request.headers.get("x-api-key") ?? null;
  if (!raw) return anthropicErrorResponse(401, "Missing API key");
  const auth = await authenticateApiKey(raw);
  if (!auth.ok) return anthropicErrorResponse(auth.status, auth.message);

  // 2) Parse body
  const parsed = await parseJsonBody<AnthropicBody>(request);
  if (!parsed.ok) return anthropicErrorResponse(400, parsed.message);
  const aBody = parsed.body;
  if (!aBody.model) return anthropicErrorResponse(400, "Missing 'model' field");
  if (!aBody.max_tokens) return anthropicErrorResponse(400, "Missing 'max_tokens' field");
  if (!Array.isArray(aBody.messages) || aBody.messages.length === 0) {
    return anthropicErrorResponse(400, "Missing or empty 'messages' array");
  }

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

  // 6) Preflight credit/budget
  const pre = await preflightCredit(
    auth.user.id,
    auth.apiKey.id,
    auth.apiKey.monthlyBudget,
    auth.apiKey.monthlySpent,
    auth.user.creditBalance,
  );
  if (!pre.ok) return anthropicErrorResponse(pre.status, pre.message);

  // 7a) Canned response
  if (enforce.kind === "canned") {
    if (aBody.stream) {
      return new Response(
        cannedAnthropicStream(model.publicId, enforce.text),
        { status: 200, headers: SSE_HEADERS },
      );
    }
    const resp = cannedAnthropicResponse(model.publicId, enforce.text);
    void recordUsageAndDeduct({
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: false,
      promptTokens: 0,
      completionTokens: Math.ceil(enforce.text.length / 4),
      status: "canned",
      httpStatus: 200,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }).catch(() => {});
    return NextResponse.json(resp);
  }

  // 7b) Forward
  const forwardBody: OpenAIChatBody = {
    ...(enforce.kind === "stripped" ? enforce.body : openaiBody),
    model: model.upstreamId,
  };

  if (aBody.stream) {
    return await handleStream({
      request,
      auth,
      model,
      body: forwardBody,
      modelPublicId: model.publicId,
      startMs,
      clientIp,
    });
  }
  return await handleNonStream({
    auth,
    model,
    body: forwardBody,
    startMs,
    clientIp,
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /anthropic/v1/messages]", msg);
    return anthropicErrorResponse(500, msg);
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
  auth: Extract<Awaited<ReturnType<typeof authenticateApiKey>>, { ok: true }>;
  model: Model;
  body: OpenAIChatBody;
  startMs: number;
  clientIp: string | null;
}) {
  const { auth, model, body, startMs, clientIp } = params;
  try {
    const upstream = await callUpstream({
      path: "/chat/completions",
      body,
      stream: false,
    });
    const usage = extractUsageFromResponse(upstream.json);

    void recordUsageAndDeduct({
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: false,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      status: upstream.status >= 200 && upstream.status < 300 ? "ok" : "error",
      httpStatus: upstream.status,
      errorMessage:
        upstream.status >= 400
          ? JSON.stringify(upstream.json).slice(0, 1000)
          : null,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }).catch(() => {});

    if (upstream.status >= 400) {
      // Translate OpenAI upstream error into Anthropic error
      const msg =
        (upstream.json as { error?: { message?: string } })?.error?.message ??
        "Upstream error";
      return anthropicErrorResponse(upstream.status, msg);
    }

    const anthropicResp = openAIToAnthropic(
      upstream.json as Parameters<typeof openAIToAnthropic>[0],
    );
    return NextResponse.json(anthropicResp, {
      headers: { "X-Model-Resolved-To": model.upstreamId },
    });
  } catch (err) {
    return anthropicErrorResponse(
      502,
      err instanceof Error ? err.message : "Upstream error",
    );
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
  startMs: number;
  clientIp: string | null;
}) {
  const { request, auth, model, body, modelPublicId, startMs, clientIp } = params;
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
    return anthropicErrorResponse(
      502,
      err instanceof Error ? err.message : "Upstream error",
    );
  }

  // Capture the final usage from the upstream OpenAI SSE for metering.
  let finalUsage = { promptTokens: 0, completionTokens: 0 };
  let usageRecorded = false;
  const decoder = new TextDecoder();
  let sseAccum = "";

  function recordFinalUsage(status: "ok" | "error") {
    if (usageRecorded) return;
    usageRecorded = true;
    void recordUsageAndDeduct({
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "anthropic",
      endpoint: "messages",
      streamed: true,
      promptTokens: finalUsage.promptTokens,
      completionTokens: finalUsage.completionTokens,
      status,
      httpStatus: 200,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }).catch(() => {});
  }

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
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
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            if (obj.usage) {
              finalUsage = {
                promptTokens: Number(obj.usage.prompt_tokens ?? 0) || 0,
                completionTokens: Number(obj.usage.completion_tokens ?? 0) || 0,
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
    flush() {
      // FIX #12: Normal completion — record usage.
      recordFinalUsage("ok");
    },
  });

  // FIX #12: Also record usage if client disconnects (cancel skips flush).
  request.signal.addEventListener("abort", () => recordFinalUsage("ok"), { once: true });

  // Upstream (OpenAI SSE) -> transform to capture usage -> transform to Anthropic SSE
  const anthropicStream = transformOpenAIStreamToAnthropic(
    upstream.stream.pipeThrough(transformStream),
    modelPublicId,
    request.signal,
  );

  return new Response(anthropicStream, {
    status: 200,
    headers: {
      ...SSE_HEADERS,
      "X-Model-Resolved-To": model.upstreamId,
    },
  });
}
