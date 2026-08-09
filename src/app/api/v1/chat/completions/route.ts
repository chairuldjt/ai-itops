import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, extractApiKey, isModelAllowed, modelAccessDecision } from "@/lib/gateway/api-key";
import { resolveModel, listEnabledModels } from "@/lib/gateway/model-resolver";
import type { Model } from "@/lib/db/schema";
import {
  enforceCapabilities,
  type OpenAIChatBody,
} from "@/lib/gateway/capability-enforcer";
import { createLeaseExtender, createSettlementController, finalizeBilling, preflightBilling, withDefaultOutputBudget } from "@/lib/gateway/billing";
import { callUpstream, callUpstreamStream } from "@/lib/gateway/openai";
import {
  buildCannedCompletionResponse,
  buildCannedCompletionStream,
  ensureStreamUsage,
  extractUsageFromResponse,
} from "@/lib/gateway/openai";
import {
  openaiErrorResponse,
  SSE_HEADERS,
  parseJsonBody,
  getClientIp,
} from "@/lib/gateway/response";
import { openAIChatRequestSchema } from "@/lib/gateway/validation";
import { internalErrorMessage, safeUpstreamMessage } from "@/lib/gateway/errors";

/* -------------------------------------------------------------------------- */
/*                              CORS preflight                                  */
/* -------------------------------------------------------------------------- */

/** CORS preflight for browser-based agents (this route had POST only). */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                              GET /v1/models                                */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  const raw = extractApiKey(request);
  if (!raw) {
    return openaiErrorResponse(401, "Missing API key");
  }
  const auth = await authenticateApiKey(raw);
  if (!auth.ok) return openaiErrorResponse(auth.status, auth.message);

  const rows = (await listEnabledModels()).filter((m) =>
    isModelAllowed(auth.apiKey, m.publicId),
  );
  return NextResponse.json({
    object: "list",
    data: rows.map((m) => ({
      id: m.publicId,
      object: "model",
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: m.provider ?? "ai-gateway",
      type: m.type,
      capabilities: m.capabilities,
      pricing: m.pricing,
    })),
  });
}

/* -------------------------------------------------------------------------- */
/*                      POST /v1/chat/completions                             */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  const startMs = Date.now();
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);
  let releaseReservation: (() => Promise<void>) | null = null;
  const billingState = { canRelease: true };

  // FIX #11: Wrap entire handler in try/catch to return proper OpenAI error JSON.
  try {
  // 1) Auth
  const raw = extractApiKey(request);
  if (!raw) return openaiErrorResponse(401, "Missing API key");
  const auth = await authenticateApiKey(raw);
  if (!auth.ok) return openaiErrorResponse(auth.status, auth.message, undefined, auth.retryAfterSeconds ? { "Retry-After": String(auth.retryAfterSeconds) } : undefined);

  // 2) Parse body
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return openaiErrorResponse(parsed.status, parsed.message);
  const validated = openAIChatRequestSchema.safeParse(parsed.body);
  if (!validated.success) return openaiErrorResponse(400, validated.error.issues[0]?.message ?? "Invalid request body");
  const body = validated.data as OpenAIChatBody;

  // 3) Resolve model
  const resolved = await resolveModel(String(body.model));
  if (!resolved.ok) return openaiErrorResponse(resolved.status, resolved.message);
  const model = resolved.model;

  // 3b) Per-key model allowlist
  const modelAccess = modelAccessDecision(auth.apiKey, model.publicId);
  if (!modelAccess.ok) return openaiErrorResponse(modelAccess.status, modelAccess.message);

  // 4) Capability enforcement
  const enforce = enforceCapabilities(body, model);
  if (enforce.kind === "rejected") {
    return openaiErrorResponse(enforce.status, enforce.message);
  }

  // 5) Preflight credit/budget check
  const pre = await preflightBilling({
    userId: auth.user.id,
    apiKeyId: auth.apiKey.id,
    model,
    // Requests without max_tokens would otherwise reserve zero output tokens
    // and settle any generated output as uncollectible debt.
    body: withDefaultOutputBudget(body, model.capabilities?.maxContextTokens),
  });
  if (!pre.ok) return openaiErrorResponse(pre.status, pre.message);
  const reservationId = pre.reservation.id;
  releaseReservation = () => finalizeBilling(reservationId, {
    modelId: model.id,
    modelPublicId: model.publicId,
    apiFormat: "openai",
    endpoint: "chat.completions",
    streamed: body.stream === true,
    promptTokens: 0,
    completionTokens: 0,
    status: "error",
    httpStatus: 500,
    latencyMs: Date.now() - startMs,
    clientIp,
    model,
  }, { actualMicroUsd: 0n });

  // 6a) Canned response short-circuit (no upstream call)
  if (enforce.kind === "canned") {
    const isStream = body.stream === true;
    if (isStream) {
      const stream = buildCannedCompletionStream({
        model: model.publicId,
        content: enforce.text,
      });
      // Record usage (cost = 0, status = canned) async so we don't block
    billingState.canRelease = false;
    await finalizeBilling(reservationId, {
        modelId: model.id,
        modelPublicId: model.publicId,
        apiFormat: "openai",
        endpoint: "chat.completions",
        streamed: true,
        promptTokens: 0,
        completionTokens: Math.ceil(enforce.text.length / 4),
        status: "canned",
        httpStatus: 200,
        latencyMs: Date.now() - startMs,
        clientIp,
        model,
      }, { actualMicroUsd: 0n });
      return new Response(stream, { status: 200, headers: SSE_HEADERS });
    }
    const resp = buildCannedCompletionResponse({
      model: model.publicId,
      content: enforce.text,
    });
    billingState.canRelease = false;
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "chat.completions",
      streamed: false,
      promptTokens: 0,
      completionTokens: Math.ceil(enforce.text.length / 4),
      status: "canned",
      httpStatus: 200,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }, { actualMicroUsd: 0n });
    return NextResponse.json(resp);
  }

  // 6b) Forward to upstream (streaming or not)
  const forwardBody =
    enforce.kind === "stripped" ? enforce.body : body;
  const isStream = forwardBody.stream === true;

  // Replace model name with the upstream id so the upstream understands it
  const upstreamBody: OpenAIChatBody = {
    ...forwardBody,
    model: model.upstreamId,
  };

  if (isStream) {
    return await handleStream({
      request,
      auth,
      model,
      body: upstreamBody,
      reservationId,
      billingState,
      requestId,
      startMs,
      clientIp,
    });
  }
  const resp = await handleNonStream({
    request,
    auth,
    model,
    body: upstreamBody,
    reservationId,
    billingState,
    requestId,
    startMs,
    clientIp,
  });
  return resp;
  } catch (err) {
    if (releaseReservation && billingState.canRelease) await releaseReservation();
    console.error(`[${requestId}] [POST /v1/chat/completions]`, err);
    return openaiErrorResponse(500, internalErrorMessage(500), undefined, undefined, requestId);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Non-streaming                                */
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
  const { model, body, reservationId, billingState, requestId, startMs, clientIp } = params;
  try {
    const upstream = await callUpstream({
      path: "/chat/completions",
      body,
      stream: false,
      signal: params.request.signal,
    });

    const usage = extractUsageFromResponse(upstream.json);

    // Meter even on upstream errors (cost will be 0 since usage = 0).
    const isOk = upstream.status >= 200 && upstream.status < 300;
    billingState.canRelease = false;
    await finalizeBilling(reservationId, {
        modelId: model.id,
        modelPublicId: model.publicId,
        apiFormat: "openai",
        endpoint: "chat.completions",
        streamed: false,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        cachedTokens: usage.cachedTokens,
        status: isOk ? "ok" : "error",
        httpStatus: upstream.status,
        errorMessage: isOk ? null : JSON.stringify(upstream.json).slice(0, 1000),
        latencyMs: Date.now() - startMs,
        clientIp,
        model,
      });

    if (!isOk) {
      // Translate upstream error into an OpenAI-style error for the client.
      if (upstream.status >= 500) console.error(`[${requestId}] [POST /v1/chat/completions upstream ${upstream.status}]`, upstream.json);
      const safeMessage = safeUpstreamMessage(upstream.status, upstream.json);
      return openaiErrorResponse(upstream.status >= 500 || !safeMessage ? 502 : upstream.status, safeMessage ?? internalErrorMessage(502), undefined, undefined, safeMessage ? undefined : requestId);
    }

    return NextResponse.json(upstream.json, {
      status: upstream.status,
      headers: {
        "X-Model-Resolved-To": model.upstreamId,
      },
    });
  } catch (err) {
    if (!billingState.canRelease) {
      console.error(`[${requestId}] [POST /v1/chat/completions billing]`, err);
      return openaiErrorResponse(500, internalErrorMessage(500), undefined, undefined, requestId);
    }
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "chat.completions",
      streamed: false,
      promptTokens: 0,
      completionTokens: 0,
      status: "error",
      httpStatus: 502,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    });
    console.error(`[${requestId}] [POST /v1/chat/completions upstream]`, err);
    return openaiErrorResponse(502, internalErrorMessage(502), undefined, undefined, requestId);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Streaming                                 */
/* -------------------------------------------------------------------------- */

async function handleStream(params: {
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

  // Ensure upstream returns a final usage chunk
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
      apiFormat: "openai",
      endpoint: "chat.completions",
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
    console.error(`[${requestId}] [POST /v1/chat/completions upstream stream]`, err);
    return openaiErrorResponse(502, internalErrorMessage(502), undefined, undefined, requestId);
  }

  // Pass-through the upstream SSE chunks to the client, but intercept the
  // final usage chunk so we can meter after the stream closes.
  let finalUsage = { promptTokens: 0, completionTokens: 0, cachedTokens: 0 };
  // Whether any content chunk was actually delivered. Used to decide billing
  // when the stream ends without a usage report: if content was delivered we
  // charge the reserved estimate; if nothing was delivered we refund.
  let sawContent = false;
  const reader = upstream.stream.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  const extendLease = createLeaseExtender(reservationId);
  const settlement = createSettlementController(async (usage: typeof finalUsage) => {
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "chat.completions",
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

  const outputStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          await recordFinalUsage();
          controller.close();
          return;
        }

        await extendLease();
        // Decode and parse the chunks so we can capture the final usage.
        sseBuffer += decoder.decode(value, { stream: true });

        // FIX #16: Guard against unbounded buffer growth.
        if (sseBuffer.length > 1_000_000) {
          sseBuffer = sseBuffer.slice(-100_000);
        }

        // Look for SSE events in the buffer without consuming them.
        const events = sseBuffer.split("\n\n");
        // The last element is incomplete (no trailing \n\n), keep it in buffer.
        sseBuffer = events.pop() ?? "";

        for (const raw of events) {
          const lines = raw.split("\n");
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
                // The upstream's "cached tokens" bucket = cache read + cache write.
                cachedTokens:
                  (Number(details?.cached_tokens ?? 0) || 0) +
                  (Number(details?.cache_creation_tokens ?? 0) || 0),
              };
            }
          } catch {
            // ignore unparseable
          }
        }

        // Forward the raw bytes as-is to the client (preserves upstream SSE format)
        controller.enqueue(value);
      } catch (err) {
        // FIX #12: Record usage even on stream error.
        await recordFinalUsage();
        controller.error(err);
      }
    },
    async cancel(reason) {
      const cancelUpstream = reader.cancel(reason);
      await Promise.allSettled([cancelUpstream, recordFinalUsage()]).then((results) => {
        const settlementResult = results[1];
        if (settlementResult.status === "rejected") throw settlementResult.reason;
      });
    },
  });

  return new Response(outputStream, {
    status: upstream.status,
    headers: {
      ...SSE_HEADERS,
      "X-Model-Resolved-To": model.upstreamId,
    },
  });
}
