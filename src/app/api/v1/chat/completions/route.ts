import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, extractApiKey } from "@/lib/gateway/api-key";
import { resolveModel, listEnabledModels } from "@/lib/gateway/model-resolver";
import type { Model } from "@/lib/db/schema";
import {
  enforceCapabilities,
  type OpenAIChatBody,
} from "@/lib/gateway/capability-enforcer";
import { preflightCredit, recordUsageAndDeduct } from "@/lib/gateway/meter";
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

  const rows = await listEnabledModels();
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
  const clientIp = getClientIp(request);

  // FIX #11: Wrap entire handler in try/catch to return proper OpenAI error JSON.
  try {
  // 1) Auth
  const raw = extractApiKey(request);
  if (!raw) return openaiErrorResponse(401, "Missing API key");
  const auth = await authenticateApiKey(raw);
  if (!auth.ok) return openaiErrorResponse(auth.status, auth.message);

  // 2) Parse body
  const parsed = await parseJsonBody<OpenAIChatBody>(request);
  if (!parsed.ok) return openaiErrorResponse(400, parsed.message);
  const body = parsed.body;
  if (!body.model) return openaiErrorResponse(400, "Missing 'model' field");
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return openaiErrorResponse(400, "Missing or empty 'messages' array");
  }

  // 3) Resolve model
  const resolved = await resolveModel(String(body.model));
  if (!resolved.ok) return openaiErrorResponse(resolved.status, resolved.message);
  const model = resolved.model;

  // 4) Capability enforcement
  const enforce = enforceCapabilities(body, model);
  if (enforce.kind === "rejected") {
    return openaiErrorResponse(enforce.status, enforce.message);
  }

  // 5) Preflight credit/budget check
  const pre = await preflightCredit(
    auth.user.id,
    auth.apiKey.id,
    auth.apiKey.monthlyBudget,
    auth.apiKey.monthlySpent,
    auth.user.creditBalance,
  );
  if (!pre.ok) return openaiErrorResponse(pre.status, pre.message);

  // 6a) Canned response short-circuit (no upstream call)
  if (enforce.kind === "canned") {
    const isStream = body.stream === true;
    if (isStream) {
      const stream = buildCannedCompletionStream({
        model: model.publicId,
        content: enforce.text,
      });
      // Record usage (cost = 0, status = canned) async so we don't block
      void recordUsageAndDeduct({
        userId: auth.user.id,
        apiKeyId: auth.apiKey.id,
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
      }).catch(() => {});
      return new Response(stream, { status: 200, headers: SSE_HEADERS });
    }
    const resp = buildCannedCompletionResponse({
      model: model.publicId,
      content: enforce.text,
    });
    void recordUsageAndDeduct({
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
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
    }).catch(() => {});
    return NextResponse.json(resp);
  }

  // 6b) Forward to upstream (streaming or not)
  const forwardBody =
    enforce.kind === "stripped" ? enforce.body : body;
  const isStream = forwardBody.stream === true;

  // Replace model name with the upstream id so 9router understands it
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
      startMs,
      clientIp,
    });
  }
  const resp = await handleNonStream({
    auth,
    model,
    body: upstreamBody,
    startMs,
    clientIp,
  });
  return resp;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /v1/chat/completions]", msg);
    return openaiErrorResponse(500, msg);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Non-streaming                                */
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

    // Meter even on upstream errors (cost will be 0 since usage = 0).
    const isOk = upstream.status >= 200 && upstream.status < 300;
    void recordUsageAndDeduct({
        userId: auth.user.id,
        apiKeyId: auth.apiKey.id,
        modelId: model.id,
        modelPublicId: model.publicId,
        apiFormat: "openai",
        endpoint: "chat.completions",
        streamed: false,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        cacheReadTokens: usage.cacheReadTokens,
        cacheWriteTokens: usage.cacheWriteTokens,
        status: isOk ? "ok" : "error",
        httpStatus: upstream.status,
        errorMessage: isOk ? null : JSON.stringify(upstream.json).slice(0, 1000),
        latencyMs: Date.now() - startMs,
        clientIp,
        model,
      }).catch(() => {});

    if (!isOk) {
      // Translate upstream error into an OpenAI-style error for the client.
      const err = upstream.json as
        | { error?: { message?: string; type?: string; code?: string } }
        | { raw?: string };
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        (err as { raw?: string })?.raw?.slice(0, 500) ??
        `Upstream returned ${upstream.status}`;
      return openaiErrorResponse(upstream.status, message);
    }

    return NextResponse.json(upstream.json, {
      status: upstream.status,
      headers: {
        "X-Model-Resolved-To": model.upstreamId,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[handleNonStream catch]", msg);
    return openaiErrorResponse(502, msg);
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
  startMs: number;
  clientIp: string | null;
}) {
  const { request, auth, model, body, startMs, clientIp } = params;

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
    return openaiErrorResponse(
      502,
      err instanceof Error ? err.message : "Upstream error",
    );
  }

  // Pass-through the upstream SSE chunks to the client, but intercept the
  // final usage chunk so we can meter after the stream closes.
  let finalUsage = { promptTokens: 0, completionTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const reader = upstream.stream.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let usageRecorded = false;

  function recordFinalUsage() {
    if (usageRecorded) return;
    usageRecorded = true;
    void recordUsageAndDeduct({
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
      modelId: model.id,
      modelPublicId: model.publicId,
      apiFormat: "openai",
      endpoint: "chat.completions",
      streamed: true,
      promptTokens: finalUsage.promptTokens,
      completionTokens: finalUsage.completionTokens,
      cacheReadTokens: finalUsage.cacheReadTokens,
      cacheWriteTokens: finalUsage.cacheWriteTokens,
      status: "ok",
      httpStatus: 200,
      latencyMs: Date.now() - startMs,
      clientIp,
      model,
    }).catch(() => {});
  }

  const outputStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          recordFinalUsage();
          controller.close();
          return;
        }

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
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                prompt_tokens_details?: { cached_tokens?: number };
              };
            };
            if (obj.usage) {
              finalUsage = {
                promptTokens: Number(obj.usage.prompt_tokens ?? 0) || 0,
                completionTokens: Number(obj.usage.completion_tokens ?? 0) || 0,
                cacheReadTokens:
                  Number(obj.usage.prompt_tokens_details?.cached_tokens ?? 0) || 0,
                cacheWriteTokens: 0,
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
        recordFinalUsage();
        controller.error(err);
      }
    },
    cancel(reason) {
      // FIX #12: Client disconnected — still record partial usage.
      recordFinalUsage();
      return reader.cancel(reason);
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
