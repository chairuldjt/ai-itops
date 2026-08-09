/**
 * OpenAI Responses API <-> Chat Completions translation.
 *
 * Newer OpenAI SDKs and Codex CLI speak the Responses API (`/v1/responses`),
 * which wraps chat completions in a richer event/item model. We translate the
 * request to a chat completion, forward to the OpenAI-compatible upstream, and
 * translate the response (streaming or not) back into Responses events.
 *
 * Modeled on 9router's `openai-responses` translator.
 */

import type { OpenAIChatBody, OpenAIMessage, OpenAIContentPart } from "./capability-enforcer";
import { repairToolArguments, repairToolName } from "./anthropic";

/* -------------------------------------------------------------------------- */
/*                          Request: Responses -> chat                        */
/* -------------------------------------------------------------------------- */

export interface ResponsesRequestBody {
  model: string;
  input?: string | ResponsesInputItem[];
  instructions?: string;
  stream?: boolean;
  tools?: ResponsesTool[];
  tool_choice?: unknown;
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
  reasoning?: { effort?: string };
  reasoning_effort?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResponsesInputItem {
  type?: string;
  role?: string;
  content?: string | ResponsesContentPart[];
  // function_call
  call_id?: string;
  name?: string;
  arguments?: string;
  // function_call_output
  output?: string;
  [key: string]: unknown;
}

interface ResponsesContentPart {
  type?: string;
  text?: string;
  image_url?: string | { url: string };
  [key: string]: unknown;
}

interface ResponsesTool {
  type?: string;
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Convert a Responses API request body into an OpenAI chat completion body.
 */
export function responsesToOpenAI(r: ResponsesRequestBody): OpenAIChatBody {
  const messages: OpenAIMessage[] = [];

  if (r.instructions) {
    messages.push({ role: "system", content: r.instructions });
  }

  messages.push(...convertResponsesInput(r.input));

  // Tools: Responses uses {type:"function", name, description, parameters}
  // which already matches OpenAI's function tool shape.
  const tools = r.tools
    ?.filter((t) => t && (t.type === "function" || t.type === undefined) && t.name)
    .map((t) => ({
      type: "function" as const,
      function: {
        name: t.name as string,
        description: t.description ?? "",
        parameters: t.parameters ?? { type: "object", properties: {} },
      },
    }));

  const out: OpenAIChatBody = {
    model: r.model,
    messages,
    stream: r.stream ?? false,
  };
  if (r.max_output_tokens != null) out.max_tokens = r.max_output_tokens;
  if (tools?.length) out.tools = tools;
  if (r.tool_choice != null) out.tool_choice = r.tool_choice;
  if (r.temperature != null) out.temperature = r.temperature;
  if (r.top_p != null) out.top_p = r.top_p;
  const effort = r.reasoning?.effort ?? r.reasoning_effort;
  if (effort != null) out.reasoning_effort = effort;
  return out;
}

function convertResponsesInput(input: ResponsesRequestBody["input"]): OpenAIMessage[] {
  if (input == null) return [];
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }
  const messages: OpenAIMessage[] = [];
  // Parallel tool calls arrive as separate consecutive function_call items in
  // Responses history. OpenAI-compatible upstreams reject consecutive
  // assistant messages carrying tool_calls ("assistant message with tool_calls
  // must be followed by tool messages responding to each call"), so buffer
  // consecutive function_call items into a SINGLE assistant message — the same
  // strategy as 9router's openai-responses translator.
  let pendingAssistant: OpenAIMessage | null = null;
  const flushPendingAssistant = () => {
    if (pendingAssistant) {
      messages.push(pendingAssistant);
      pendingAssistant = null;
    }
  };
  for (const item of input) {
    // Items with a role but no type are treated as plain messages (some
    // clients, e.g. Droid, omit the type).
    const type = item.type ?? (item.role ? "message" : undefined);
    if (type === "message") {
      flushPendingAssistant();
      const role = (item.role as OpenAIMessage["role"]) ?? "user";
      messages.push({ role, content: convertMessageContent(item.content) });
    } else if (type === "function_call") {
      // Assistant tool call — accumulate into the pending assistant message.
      if (!pendingAssistant) {
        pendingAssistant = { role: "assistant", content: "", tool_calls: [] };
      }
      (pendingAssistant.tool_calls as Array<Record<string, unknown>>).push({
        id: item.call_id ?? item.id ?? "",
        type: "function",
        function: { name: item.name ?? "", arguments: item.arguments ?? "" },
      });
    } else if (type === "function_call_output") {
      // Tool results must directly follow the assistant message carrying the
      // matching tool_calls.
      flushPendingAssistant();
      messages.push({
        role: "tool",
        tool_call_id: item.call_id ?? "",
        content: typeof item.output === "string" ? item.output : JSON.stringify(item.output ?? ""),
      });
    }
    // reasoning / other item types are skipped.
  }
  flushPendingAssistant();
  return messages;
}

/**
 * Providers occasionally omit tool-call ids (or split them across chunks).
 * Emitting an empty call_id breaks clients that must echo it back in
 * function_call_output, so synthesize one (9router's fallbackToolCallId).
 */
function fallbackCallId(id: string): string {
  return id || `call_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function convertMessageContent(
  content: ResponsesInputItem["content"],
): string | OpenAIContentPart[] {
  if (content == null) return "";
  if (typeof content === "string") return content;
  const parts: OpenAIContentPart[] = [];
  for (const part of content) {
    const t = part.type;
    if (t === "input_text" || t === "text" || t === "output_text") {
      parts.push({ type: "text", text: part.text ?? "" });
    } else if (t === "input_image" || t === "image_url") {
      const url =
        typeof part.image_url === "string" ? part.image_url : (part.image_url?.url ?? "");
      if (url) parts.push({ type: "image_url", image_url: { url } });
    }
  }
  return parts.length > 0 ? parts : "";
}

/* -------------------------------------------------------------------------- */
/*                        Response: chat -> Responses                         */
/* -------------------------------------------------------------------------- */

interface OpenAICompletionLike {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { role?: string; content?: string | null; tool_calls?: unknown[] };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Convert a non-streaming OpenAI chat completion into a Responses API object.
 *
 * `knownToolNames` (from the client request) lets us repair duplicated tool
 * names produced by upstream stream aggregation (see repairToolName).
 */
export function openAIToResponses(
  o: OpenAICompletionLike,
  knownToolNames?: ReadonlySet<string>,
): Record<string, unknown> {
  const output: Record<string, unknown>[] = [];
  const choice = o.choices?.[0];
  const msg = choice?.message;

  if (msg?.content) {
    output.push({
      type: "message",
      id: `msg_${(o.id ?? Date.now().toString(36)).replace(/^chatcmpl-/, "")}`,
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: msg.content }],
    });
  }
  if (Array.isArray(msg?.tool_calls)) {
    for (const tc of msg!.tool_calls as Array<{
      id?: string;
      function?: { name?: string; arguments?: string };
    }>) {
      const name = repairToolName(tc.function?.name ?? "", knownToolNames);
      output.push({
        type: "function_call",
        id: `fc_${fallbackCallId(tc.id ?? "").replace(/^call_/, "")}`,
        call_id: fallbackCallId(tc.id ?? ""),
        name,
        arguments: repairToolArguments(tc.function?.arguments ?? ""),
        status: "completed",
      });
    }
  }
  // Guarantee a non-empty output array.
  if (output.length === 0) {
    output.push({
      type: "message",
      id: `msg_${Date.now().toString(36)}`,
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: "" }],
    });
  }

  return {
    id: `resp_${(o.id ?? Date.now().toString(36)).replace(/^chatcmpl-/, "")}`,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status: "completed",
    model: o.model ?? "",
    output,
    usage: {
      input_tokens: o.usage?.prompt_tokens ?? 0,
      output_tokens: o.usage?.completion_tokens ?? 0,
      total_tokens:
        o.usage?.total_tokens ??
        (o.usage?.prompt_tokens ?? 0) + (o.usage?.completion_tokens ?? 0),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                 Streaming: OpenAI chat SSE -> Responses SSE                */
/* -------------------------------------------------------------------------- */

/**
 * Transform an OpenAI chat SSE stream into a Responses API SSE stream.
 * Emits the standard Responses event sequence and always terminates with
 * `response.completed` (synthesized if the upstream ended without one).
 */
export function transformOpenAIStreamToResponses(
  upstream: ReadableStream<Uint8Array>,
  modelPublicId: string,
  knownToolNames?: ReadonlySet<string>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.getReader();

  const responseId = `resp_${Date.now().toString(36)}`;
  const msgId = `msg_${Date.now().toString(36)}`;
  let buffer = "";
  let closed = false;
  // Text accumulation for the current message item.
  let textAcc = "";
  let textItemOpen = false;
  // Buffered function calls keyed by OpenAI tool_call index.
  const fnCalls = new Map<number, { id: string; name: string; args: string }>();
  let inputTokens = 0;
  let outputTokens = 0;

  const emit = (event: string, data: unknown): string =>
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  const baseResponse = (status: string) => ({
    id: responseId,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status,
    model: modelPublicId,
    output: [],
  });

  const buildFinalResponse = () => {
    const output: Record<string, unknown>[] = [];
    if (textAcc.length > 0 || (textItemOpen && textAcc.length === 0)) {
      output.push({
        type: "message",
        id: msgId,
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: textAcc }],
      });
    }
    for (const [, fc] of [...fnCalls.entries()].sort((a, b) => a[0] - b[0])) {
      output.push({
        type: "function_call",
        id: `fc_${(fallbackCallId(fc.id)).replace(/^call_/, "")}`,
        call_id: fallbackCallId(fc.id),
        name: repairToolName(fc.name, knownToolNames),
        arguments: repairToolArguments(fc.args),
        status: "completed",
      });
    }
    if (output.length === 0) {
      output.push({
        type: "message",
        id: msgId,
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: "" }],
      });
    }
    return {
      id: responseId,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      status: "completed",
      model: modelPublicId,
      output,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
    };
  };

  const openTextItem = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (textItemOpen) return;
    textItemOpen = true;
    controller.enqueue(
      encoder.encode(
        emit("response.output_item.added", {
          type: "response.output_item.added",
          output_index: 0,
          item: { type: "message", id: msgId, role: "assistant", content: [] },
        }),
      ),
    );
    controller.enqueue(
      encoder.encode(
        emit("response.content_part.added", {
          type: "response.content_part.added",
          item_id: msgId,
          output_index: 0,
          content_index: 0,
          part: { type: "output_text", text: "" },
        }),
      ),
    );
  };

  const closeTextItem = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (!textItemOpen) return;
    textItemOpen = false;
    controller.enqueue(
      encoder.encode(
        emit("response.output_text.done", {
          type: "response.output_text.done",
          item_id: msgId,
          output_index: 0,
          content_index: 0,
          text: textAcc,
        }),
      ),
    );
    controller.enqueue(
      encoder.encode(
        emit("response.content_part.done", {
          type: "response.content_part.done",
          item_id: msgId,
          output_index: 0,
          content_index: 0,
          part: { type: "output_text", text: textAcc },
        }),
      ),
    );
    controller.enqueue(
      encoder.encode(
        emit("response.output_item.done", {
          type: "response.output_item.done",
          output_index: 0,
          item: {
            type: "message",
            id: msgId,
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: textAcc }],
          },
        }),
      ),
    );
  };

  const flushFunctionCalls = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    let outputIndex = textAcc.length > 0 || !textItemOpen ? 1 : 0;
    // If a text item exists it occupies output_index 0; function calls follow.
    outputIndex = textAcc.length > 0 ? 1 : 0;
    for (const [, fc] of [...fnCalls.entries()].sort((a, b) => a[0] - b[0])) {
      const callId = fallbackCallId(fc.id);
      const callName = repairToolName(fc.name, knownToolNames);
      const callArgs = repairToolArguments(fc.args);
      controller.enqueue(
        encoder.encode(
          emit("response.output_item.added", {
            type: "response.output_item.added",
            output_index: outputIndex,
            item: {
              type: "function_call",
              id: `fc_${callId.replace(/^call_/, "")}`,
              call_id: callId,
              name: callName,
              arguments: "",
              status: "in_progress",
            },
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          emit("response.function_call_arguments.done", {
            type: "response.function_call_arguments.done",
            item_id: `fc_${callId.replace(/^call_/, "")}`,
            output_index: outputIndex,
            arguments: callArgs,
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          emit("response.output_item.done", {
            type: "response.output_item.done",
            output_index: outputIndex,
            item: {
              type: "function_call",
              id: `fc_${callId.replace(/^call_/, "")}`,
              call_id: callId,
              name: callName,
              arguments: callArgs,
              status: "completed",
            },
          }),
        ),
      );
      outputIndex += 1;
    }
    fnCalls.clear();
  };

  const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (closed) return;
    closed = true;
    closeTextItem(controller);
    flushFunctionCalls(controller);
    controller.enqueue(
      encoder.encode(emit("response.completed", { type: "response.completed", response: buildFinalResponse() })),
    );
    controller.close();
  };

  // Upstream routers (9router included) surface provider failures mid-stream
  // as an error JSON chunk followed by close. Emit a proper failed response
  // instead of silently finishing a truncated "completed" response.
  const failWithError = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    error: { message?: string; type?: string; code?: string | number | null },
  ) => {
    if (closed) return;
    closed = true;
    closeTextItem(controller);
    const errorBody = {
      code: error.code ?? null,
      message: error.message ?? "Upstream error",
      type: error.type ?? "upstream_error",
    };
    controller.enqueue(
      encoder.encode(emit("error", { type: "error", error: errorBody })),
    );
    controller.enqueue(
      encoder.encode(
        emit("response.failed", {
          type: "response.failed",
          response: { ...baseResponse("failed"), error: errorBody },
        }),
      ),
    );
    controller.close();
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Emit the created/in_progress envelope immediately.
      controller.enqueue(
        encoder.encode(emit("response.created", { type: "response.created", response: baseResponse("created") })),
      );
      controller.enqueue(
        encoder.encode(
          emit("response.in_progress", { type: "response.in_progress", response: baseResponse("in_progress") }),
        ),
      );
    },
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          finish(controller);
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLines: string[] = [];
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
          }
          if (dataLines.length === 0) continue;
          const joined = dataLines.join("\n");
          if (joined === "[DONE]") {
            finish(controller);
            return;
          }
          let chunk: {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string | null;
            }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
            error?: { message?: string; type?: string; code?: string | number | null };
          };
          try {
            chunk = JSON.parse(joined);
          } catch {
            continue;
          }
          // Mid-stream upstream failure: surface it instead of finishing a
          // truncated "completed" response.
          if (chunk.error) {
            failWithError(controller, chunk.error);
            return;
          }
          // Usage-only final chunk.
          if (chunk.usage && (!chunk.choices || chunk.choices.length === 0)) {
            if (chunk.usage.prompt_tokens != null) inputTokens = chunk.usage.prompt_tokens;
            if (chunk.usage.completion_tokens != null) outputTokens = chunk.usage.completion_tokens;
            continue;
          }
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta ?? {};
          if (typeof delta.content === "string" && delta.content.length > 0) {
            openTextItem(controller);
            textAcc += delta.content;
            outputTokens += Math.max(1, Math.ceil(delta.content.length / 4));
            controller.enqueue(
              encoder.encode(
                emit("response.output_text.delta", {
                  type: "response.output_text.delta",
                  item_id: msgId,
                  output_index: 0,
                  content_index: 0,
                  delta: delta.content,
                }),
              ),
            );
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const existing = fnCalls.get(tc.index);
              if (!existing) {
                fnCalls.set(tc.index, {
                  id: tc.id ?? "",
                  name: tc.function?.name ?? "",
                  args: tc.function?.arguments ?? "",
                });
              } else {
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.args += tc.function.arguments;
              }
            }
          }
          if (chunk.usage) {
            if (chunk.usage.prompt_tokens != null) inputTokens = chunk.usage.prompt_tokens;
            if (chunk.usage.completion_tokens != null) outputTokens = chunk.usage.completion_tokens;
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
