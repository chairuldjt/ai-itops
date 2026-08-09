import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, extractApiKey } from "@/lib/gateway/api-key";
import { resolveModel } from "@/lib/gateway/model-resolver";
import type { Model } from "@/lib/db/schema";
import { enforceCapabilities, type OpenAIChatBody } from "@/lib/gateway/capability-enforcer";
import {
  createLeaseExtender,
  createSettlementController,
  finalizeBilling,
  preflightBilling,
  withDefaultOutputBudget,
} from "@/lib/gateway/billing";
import { callUpstream, callUpstreamStream, ensureStreamUsage, extractUsageFromResponse } from "@/lib/gateway/openai";
import {
  responsesToOpenAI,
  openAIToResponses,
  transformOpenAIStreamToResponses,
  type ResponsesRequestBody,
} from "@/lib/gateway/responses";
import { knownToolNameSet } from "@/lib/gateway/anthropic";
import { SSE_HEADERS, parseJsonBody, getClientIp, openaiErrorResponse } from "@/lib/gateway/response";
import { internalErrorMessage, safeUpstreamMessage } from "@/lib/gateway/errors";

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
 * POST /api/v1/responses — OpenAI Responses API (Codex CLI, newer OpenAI SDKs).
 * Translated to the OpenAI-compatible upstream and back.
 */
export async function POST(request: NextRequest) {
  const startMs = Date.now();
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);
  let releaseReservation: (() => Promise<void>) | null = null;
  const billingState = { canRelease: true };

  try {
    // 1) Auth
    const raw = extractApiKey(request) ?? request.headers.get("x-api-key") ?? null;
    if (!raw) return openaiErrorResponse(401, "Missing API key");
    const auth = await authenticateApiKey(raw);
    if (!auth.ok) {
      return openaiErrorResponse(
        auth.status,
        auth.message,
        undefined,
        auth.retryAfterSeconds ? { "Retry-After": String(auth.retryAfterSeconds) } : undefined,
      );
    }

    // 2) Parse body
    const parsed = await parseJsonBody<ResponsesRequestBody>(request);
    if (!parsed.ok) return openaiErrorResponse(parsed.status, parsed.message);
    const rBody = parsed.body;
    if (!rBody || typeof rBody.model !== "string" || rBody.model.length === 0) {
      return openaiErrorResponse(400, "model is required");
    }

    // 3) Resolve model
    const resolved = await resolveModel(String(rBody.model));
    if (!resolved.ok) return openaiErrorResponse(resolved.status, resolved.message);
    const model = resolved.model;

    // 4) Translate to OpenAI chat
    const openaiBody = responsesToOpenAI(rBody);

    // Canonical tool names from this request — used to repair duplicated tool
    // names ("BashBash") introduced by upstream stream aggregation.
    const knownToolNames = knownToolNameSet(
      rBody.tools as Array<{ name?: unknown }> | undefined,
    );

    // 5) Capability enforcement
    const enforce = enforceCapabilities(openaiBody, model);
    if (enforce.kind === "rejected") {
      return openaiErrorResponse(enforce.status, enforce.message);
    }

    // 6) Preflight billing. Estimate from the translated OpenAI body: Responses
    // requests carry `input`/`max_output_tokens`, which the estimator (keyed on
    // messages/max_tokens) would otherwise read as ~1 input token and zero
    // output — reserving almost nothing.
    const pre = await preflightBilling({
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
      model,
      body: withDefaultOutputBudget(openaiBody, model.capabilities?.maxContextTokens),
    });
    if (!pre.ok) return openaiErrorResponse(pre.status, pre.message);
    const reservationId = pre.reservation.id;
    releaseReservation = () =>
      finalizeBilling(
        reservationId,
        {
          modelId: model.id,
          modelPublicId: model.publicId,
          apiFormat: "openai",
          endpoint: "responses",
          streamed: rBody.stream === true,
          promptTokens: 0,
          completionTokens: 0,
          status: "error",
          httpStatus: 500,
          latencyMs: Date.now() - startMs,
          clientIp,
          model,
        },
        { actualMicroUsd: 0n },
      );

    // Accept-header negotiation
    const accept = request.headers.get("accept") ?? "";
    const wantsStream =
      rBody.stream === true &&
      !(accept.includes("application/json") && !accept.includes("text/event-stream"));

    // 7) Forward
    const forwardBody: OpenAIChatBody = {
      ...(enforce.kind === "stripped" ? enforce.body : openaiBody),
      model: model.upstreamId,
      stream: wantsStream,
    };

    if (wantsStream) {
      return await handleStream({
        request,
        model,
        body: forwardBody,
        reservationId,
        billingState,
        requestId,
        startMs,
        clientIp,
        knownToolNames,
      });
    }
    return await handleNonStream({
      request,
      model,
      body: forwardBody,
      reservationId,
      billingState,
      requestId,
      startMs,
      clientIp,
      knownToolNames,
    });
  } catch (err) {
    if (releaseReservation && billingState.canRelease) await releaseReservation();
    console.error(`[${requestId}] [POST /v1/responses]`, err);
    return openaiErrorResponse(500, internalErrorMessage(500), undefined, { "X-Request-ID": requestId });
  }
}

/* -------------------------------------------------------------------------- */
/*                              Non-streaming                                 */
/* -------------------------------------------------------------------------- */

async function handleNonStream(params: {
  request: NextRequest;
  model: Model;
  body: OpenAIChatBody;
  reservationId: string;
  billingState: { canRelease: boolean };
  requestId: string;
  startMs: number;
  clientIp: string | null;
  knownToolNames?: ReadonlySet<string>;
}) {
  const { request, model, body, reservationId, billingState, requestId, startMs, clientIp, knownToolNames } = params;
  try {
    const upstream = await callUpstream({ path: "/chat/completions", body, stream: false, signal: request.signal });
    const usage = extractUsageFromResponse(upstream.json);
    billingState.canRelease = false;
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "responses",
      streamed: false,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      status: upstream.status >= 200 && upstream.status < 300 ? "ok" : "error",
      httpStatus: upstream.status,
      errorMessage: upstream.status >= 400 ? JSON.stringify(upstream.json).slice(0, 1000) : null,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    });
    if (upstream.status >= 400) {
      const safeMessage = safeUpstreamMessage(upstream.status, upstream.json);
      if (!safeMessage) console.error(`[${requestId}] [POST /v1/responses upstream ${upstream.status}]`, upstream.json);
      return openaiErrorResponse(
        upstream.status >= 500 || !safeMessage ? 502 : upstream.status,
        safeMessage ?? internalErrorMessage(502),
        undefined,
        safeMessage ? undefined : { "X-Request-ID": requestId },
      );
    }
    const responsesResp = openAIToResponses(
      upstream.json as Parameters<typeof openAIToResponses>[0],
      knownToolNames,
    );
    return NextResponse.json(responsesResp, {
      headers: { "Access-Control-Allow-Origin": "*", "X-Model-Resolved-To": model.upstreamId },
    });
  } catch (err) {
    if (!billingState.canRelease) {
      console.error(`[${requestId}] [POST /v1/responses billing]`, err);
      return openaiErrorResponse(500, internalErrorMessage(500), undefined, { "X-Request-ID": requestId });
    }
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "responses",
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
    console.error(`[${requestId}] [POST /v1/responses upstream]`, err);
    return openaiErrorResponse(502, internalErrorMessage(502), undefined, { "X-Request-ID": requestId });
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Streaming                                  */
/* -------------------------------------------------------------------------- */

async function handleStream(params: {
  request: NextRequest;
  model: Model;
  body: OpenAIChatBody;
  reservationId: string;
  billingState: { canRelease: boolean };
  requestId: string;
  startMs: number;
  clientIp: string | null;
  knownToolNames?: ReadonlySet<string>;
}) {
  const { request, model, body, reservationId, billingState, requestId, startMs, clientIp, knownToolNames } = params;
  const streamBody = ensureStreamUsage(body);

  let upstream;
  try {
    upstream = await callUpstreamStream({ path: "/chat/completions", body: streamBody, stream: true, signal: request.signal });
  } catch (err) {
    await finalizeBilling(reservationId, {
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "responses",
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
    console.error(`[${requestId}] [POST /v1/responses upstream stream]`, err);
    return openaiErrorResponse(502, internalErrorMessage(502), undefined, { "X-Request-ID": requestId });
  }

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
    await finalizeBilling(
      reservationId,
      {
        modelId: model.id,
        modelPublicId: model.publicId,
        apiFormat: "openai",
        endpoint: "responses",
        streamed: true,
        ...usage,
        status: "ok",
        httpStatus: 200,
        latencyMs: Date.now() - startMs,
        clientIp,
        model,
      },
      { chargeReserved: usage.promptTokens === 0 && usage.completionTokens === 0 && sawContent },
    );
  });
  const recordFinalUsage = () => {
    billingState.canRelease = false;
    return settlement.settle({ ...finalUsage });
  };

  // Capture final usage from the upstream OpenAI SSE, then translate to Responses.
  const usageTap = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Best-effort lease extension: a transient DB failure must not kill the
      // client stream (and never becomes an unhandled rejection).
      void extendLease().catch((err) =>
        console.error(`[${requestId}] [responses lease extension]`, err),
      );
      try {
        sseAccum += decoder.decode(chunk, { stream: true });
        if (sseAccum.length > 1_000_000) sseAccum = sseAccum.slice(-100_000);
        const events = sseAccum.split("\n\n");
        sseAccum = events.pop() ?? "";
        for (const ev of events) {
          const data: string[] = [];
          for (const l of ev.split("\n")) {
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
    flush() {
      void recordFinalUsage().catch(console.error);
    },
  });

  request.signal.addEventListener(
    "abort",
    () => {
      void recordFinalUsage().catch(console.error);
    },
    { once: true },
  );

  const responsesReader = transformOpenAIStreamToResponses(
    upstream.stream.pipeThrough(usageTap),
    model.publicId,
    knownToolNames,
  ).getReader();

  const responsesStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await responsesReader.read();
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
      const cancelUpstream = responsesReader.cancel(reason);
      await Promise.allSettled([cancelUpstream, recordFinalUsage()]).then((results) => {
        const settlementResult = results[1];
        if (settlementResult.status === "rejected") throw settlementResult.reason;
      });
    },
  });

  return new Response(responsesStream, {
    status: 200,
    headers: { ...SSE_HEADERS, "X-Model-Resolved-To": model.upstreamId },
  });
}
