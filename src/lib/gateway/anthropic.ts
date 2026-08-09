import type { OpenAIChatBody, OpenAIMessage, OpenAIContentPart } from "./capability-enforcer";

/* -------------------------------------------------------------------------- */
/*                      Anthropic -> OpenAI request translation               */
/* -------------------------------------------------------------------------- */

/**
 * Anthropic request body (subset we care about):
 * {
 *   model, max_tokens, system?, messages: [{ role, content }],
 *   tools?, tool_choice?, stream?, temperature?, top_p?, stop_sequences?,
 *   thinking?, metadata?
 * }
 */
export interface AnthropicBody {
  model: string;
  max_tokens?: number;
  system?: string | AnthropicSystemBlock[];
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  tool_choice?: { type: "auto" | "any" | "tool"; name?: string };
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  thinking?: { type: "enabled" | "disabled"; budget_tokens?: number };
  metadata?: { user_id?: string };
}

export interface AnthropicSystemBlock {
  type: "text";
  text: string;
  cache_control?: unknown;
}

export interface AnthropicMessage {
  role: string;
  content: string | AnthropicContentPart[];
}

export type AnthropicContentPart =
  | { type: "text"; text: string; cache_control?: unknown }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string } | { type: "url"; url: string };
    }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string | AnthropicContentPart[] };

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  cache_control?: unknown;
}

/* -------------------------------------------------------------------------- */
/*                              Request converter                             */
/* -------------------------------------------------------------------------- */

/**
 * Convert an Anthropic Messages API body to an OpenAI chat completion body.
 */
export function anthropicToOpenAI(a: AnthropicBody): OpenAIChatBody {
  const messages: OpenAIMessage[] = [];

  // System -> OpenAI system message (or multiple)
  if (a.system) {
    const systemText =
      typeof a.system === "string"
        ? a.system
        : a.system.map((b) => b.text).join("\n\n");
    if (systemText) {
      messages.push({ role: "system", content: systemText });
    }
  }

  for (const m of a.messages) {
    if (m.role === "user") {
      // FIX #7: convertUserMessage may return multiple messages (tool results).
      const converted = convertUserMessage(m);
      if (Array.isArray(converted)) {
        messages.push(...converted);
      } else {
        messages.push(converted);
      }
    } else if (m.role === "assistant") {
      messages.push(convertAssistantMessage(m));
    } else if (m.role === "system" || m.role === "developer") {
      // Some clients put system content in the messages array; map it to a
      // system message so it isn't silently dropped.
      const text =
        typeof m.content === "string"
          ? m.content
          : m.content
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("\n");
      if (text) messages.push({ role: "system", content: text });
    }
    // Any other role is skipped (Anthropic only defines user/assistant).
  }

  // Tools
  const tools = a.tools?.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.input_schema,
    },
  }));

  let tool_choice: unknown = undefined;
  if (a.tool_choice) {
    if (a.tool_choice.type === "auto") tool_choice = "auto";
    else if (a.tool_choice.type === "any") tool_choice = "required";
    else if (a.tool_choice.type === "tool") {
      tool_choice = {
        type: "function",
        function: { name: a.tool_choice.name },
      };
    }
  }

  // Repair orphaned tool_calls before sending: OpenAI rejects an assistant
  // tool_call that has no matching tool response (agents produce these after
  // interrupts). Insert an empty tool result for each orphan.
  repairOrphanedToolCalls(messages);

  const out: OpenAIChatBody = {
    model: a.model,
    messages,
    stream: a.stream ?? false,
    max_tokens: a.max_tokens ?? DEFAULT_MAX_TOKENS,
  };
  if (tools?.length) out.tools = tools;
  if (tool_choice) out.tool_choice = tool_choice;
  if (a.temperature != null) out.temperature = a.temperature;
  if (a.top_p != null) out.top_p = a.top_p;
  if (a.stop_sequences?.length) out.stop = a.stop_sequences;
  return out;
}

/** Fallback output budget when a client omits max_tokens (it's required upstream). */
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Insert an empty `tool` response for any assistant tool_call that lacks one.
 * OpenAI-compatible upstreams 400 on unmatched tool_calls; agents frequently
 * leave them dangling after an interrupt.
 */
function repairOrphanedToolCalls(messages: OpenAIMessage[]): void {
  const responded = new Set<string>();
  for (const m of messages) {
    if (m.role === "tool" && m.tool_call_id) responded.add(m.tool_call_id);
  }
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant" || !Array.isArray(m.tool_calls) || m.tool_calls.length === 0) continue;
    const inserts: OpenAIMessage[] = [];
    for (const tc of m.tool_calls as Array<{ id?: string }>) {
      const id = tc?.id;
      if (id && !responded.has(id)) {
        inserts.push({ role: "tool", tool_call_id: id, content: "" });
        responded.add(id);
      }
    }
    if (inserts.length > 0) {
      messages.splice(i + 1, 0, ...inserts);
      i += inserts.length;
    }
  }
}

/**
 * FIX #7: Convert Anthropic user message to OpenAI format.
 * Returns multiple messages when tool results are present (OpenAI requires
 * separate `tool` role messages for each tool result).
 */
export function convertUserMessage(m: AnthropicMessage): OpenAIMessage | OpenAIMessage[] {
  if (typeof m.content === "string") {
    return { role: "user", content: m.content };
  }
  // Mixed content (text + image + tool_result)
  // Tool results must be sent as separate `tool` role messages in OpenAI.
  const textOrImageParts: OpenAIContentPart[] = [];
  const toolResults: Array<{ id: string; content: string }> = [];

  for (const part of m.content) {
    if (part.type === "text") {
      textOrImageParts.push({ type: "text", text: part.text });
    } else if (part.type === "image") {
      const url =
        part.source.type === "base64"
          ? `data:${part.source.media_type};base64,${part.source.data}`
          : (part.source as { url: string }).url;
      textOrImageParts.push({ type: "image_url", image_url: { url } });
    } else if (part.type === "tool_result") {
      const content =
        typeof part.content === "string"
          ? part.content
          : part.content
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("\n");
      toolResults.push({ id: part.tool_use_id, content });
    }
  }

  // FIX #7: Return ALL tool results as separate messages, not just the first.
  if (textOrImageParts.length === 0 && toolResults.length > 0) {
    return toolResults.map((tr) => ({
      role: "tool" as const,
      tool_call_id: tr.id,
      content: tr.content,
    }));
  }

  // Mixed: text/images + tool results → return user message + tool messages.
  if (textOrImageParts.length > 0 && toolResults.length > 0) {
    const messages: OpenAIMessage[] = [
      { role: "user", content: textOrImageParts },
    ];
    for (const tr of toolResults) {
      messages.push({ role: "tool", tool_call_id: tr.id, content: tr.content });
    }
    return messages;
  }

  // Empty content arrays are rejected by OpenAI-compatible upstreams; send "".
  return { role: "user", content: textOrImageParts.length > 0 ? textOrImageParts : "" };
}

function convertAssistantMessage(m: AnthropicMessage): OpenAIMessage {
  if (typeof m.content === "string") {
    return { role: "assistant", content: m.content };
  }
  let text = "";
  const tool_calls: unknown[] = [];
  for (const part of m.content) {
    if (part.type === "text") text += part.text;
    else if (part.type === "tool_use") {
      tool_calls.push({
        id: part.id,
        type: "function",
        function: {
          name: part.name,
          arguments: JSON.stringify(part.input ?? {}),
        },
      });
    }
  }
  const msg: OpenAIMessage = {
    role: "assistant",
    content: text,
  };
  if (tool_calls.length) msg.tool_calls = tool_calls;
  return msg;
}

/* -------------------------------------------------------------------------- */
/*                             Response converter                             */
/* -------------------------------------------------------------------------- */

export interface OpenAICompletion {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string | null; tool_calls?: unknown[] };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Convert a non-streaming OpenAI completion to an Anthropic Messages response.
 */
export function openAIToAnthropic(
  o: OpenAICompletion,
): {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: AnthropicResponseContent[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | null;
  stop_sequence: string | null;
  usage: { input_tokens: number; output_tokens: number };
} {
  const choice = o.choices?.[0];
  const content: AnthropicResponseContent[] = [];
  let stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | null =
    "end_turn";

  // Reasoning content (GLM/DeepSeek/Qwen style) -> Anthropic thinking block.
  const reasoning = (choice?.message as { reasoning_content?: string } | undefined)
    ?.reasoning_content;
  if (reasoning) {
    content.push({ type: "thinking", thinking: reasoning });
  }

  if (choice?.message?.content) {
    content.push({ type: "text", text: choice.message.content });
  }
  if (choice?.message?.tool_calls && Array.isArray(choice.message.tool_calls)) {
    for (const tc of choice.message.tool_calls as Array<{
      id: string;
      function: { name: string; arguments: string };
    }>) {
      let input: unknown = {};
      try {
        input = JSON.parse(tc.function.arguments || "{}");
      } catch {
        input = { raw: tc.function.arguments };
      }
      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input,
      });
      stop_reason = "tool_use";
    }
  }
  if (choice?.finish_reason === "length") stop_reason = "max_tokens";
  // FIX #8: Map OpenAI "tool_calls" finish reason to Anthropic "tool_use".
  if (choice?.finish_reason === "tool_calls") stop_reason = "tool_use";
  if (choice?.finish_reason === "stop") {
    stop_reason = content.some((c) => c.type === "tool_use") ? "tool_use" : "end_turn";
  }

  return {
    id: o.id,
    type: "message",
    role: "assistant",
    model: o.model,
    content,
    stop_reason,
    stop_sequence: null,
    usage: {
      input_tokens: o.usage?.prompt_tokens ?? 0,
      output_tokens: o.usage?.completion_tokens ?? 0,
    },
  };
}

export type AnthropicResponseContent =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

/* -------------------------------------------------------------------------- */
/*                        Streaming: OpenAI SSE -> Anthropic SSE              */
/* -------------------------------------------------------------------------- */

/**
 * Transform an OpenAI SSE stream (upstream) into an Anthropic SSE stream.
 *
 * Anthropic event types we emit:
 *   message_start        -> header
 *   content_block_start  -> opening a text or tool_use block
 *   content_block_delta  -> text_delta or input_json_delta
 *   content_block_stop
 *   message_delta        -> stop_reason + usage (output)
 *   message_stop
 *   ping (optional)
 */
export function transformOpenAIStreamToAnthropic(
  upstream: ReadableStream<Uint8Array>,
  modelPublicId: string,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let buffer = "";
  const reader = upstream.getReader();
  const decoder = new TextDecoder();

  let messageId = `msg_${Date.now().toString(36)}`;
  let inputTokens = 0;
  let outputTokens = 0;
  let blockIndex = -1;
  let currentBlockType: "text" | "tool_use" | "thinking" | null = null;
  let toolCallIndex = -1;
  let toolCallId: string | null = null;
  let started = false;
  let streamClosed = false; // FIX #14: Prevent duplicate close events.
  let stopReason: AnthropicStopReason = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  const emit = (event: string, data: unknown): string =>
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Cloudflare proxy timeout is 100-120s. Send pings every 30s
      // to keep the connection alive while waiting for upstream.
      keepaliveTimer = setInterval(() => {
        if (!streamClosed) {
          try {
            controller.enqueue(encoder.encode(emit("ping", { type: "ping" })));
          } catch {
            // stream already closed
          }
        }
      }, 30_000);
    },
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        // FIX #14: Skip if stream already closed (e.g. by [DONE] event).
        if (done || streamClosed) {
          if (!streamClosed) {
            streamClosed = true;
            if (keepaliveTimer) clearInterval(keepaliveTimer);
            // Finish up — close any open block and emit final events.
            if (currentBlockType != null) {
              controller.enqueue(
                encoder.encode(
                  emit("content_block_stop", {
                    type: "content_block_stop",
                    index: blockIndex,
                  }),
                ),
              );
            }
            controller.enqueue(
              encoder.encode(
                emit("message_delta", {
                  type: "message_delta",
                  delta: { stop_reason: stopReason ?? "end_turn", stop_sequence: null },
                  usage: { input_tokens: inputTokens, output_tokens: outputTokens },
                }),
              ),
            );
            controller.enqueue(encoder.encode(emit("message_stop", { type: "message_stop" })));
          }
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = rawEvent.split("\n");
          const dataLines: string[] = [];
          for (const line of lines) {
            if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
          }
          if (dataLines.length === 0) continue;
          const joined = dataLines.join("\n");
          if (joined === "[DONE]") {
            // FIX #14: Only emit close events once.
            if (!streamClosed) {
              streamClosed = true;
              if (keepaliveTimer) clearInterval(keepaliveTimer);
              // Close any open content block before final events
              if (currentBlockType != null) {
                controller.enqueue(
                  encoder.encode(
                    emit("content_block_stop", {
                      type: "content_block_stop",
                      index: blockIndex,
                    }),
                  ),
                );
              }
              controller.enqueue(
                encoder.encode(
                  emit("message_delta", {
                    type: "message_delta",
                    delta: { stop_reason: stopReason ?? "end_turn", stop_sequence: null },
                    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
                  }),
                ),
              );
              controller.enqueue(encoder.encode(emit("message_stop", { type: "message_stop" })));
              controller.close();
            }
            return;
          }
          let chunk: unknown;
          try {
            chunk = JSON.parse(joined);
          } catch {
            continue;
          }
          const events = translateChunk(
            chunk as OpenAIStreamChunk,
            {
              messageId,
              modelPublicId,
              blockIndex,
              currentBlockType,
              toolCallIndex,
              toolCallId,
              started,
              inputTokens,
              outputTokens,
              stopReason,
            },
          );
          for (const e of events.lines) {
            controller.enqueue(encoder.encode(e));
          }
          // Update state
          messageId = events.state.messageId ?? messageId;
          blockIndex = events.state.blockIndex ?? blockIndex;
          currentBlockType = events.state.currentBlockType ?? currentBlockType;
          toolCallIndex = events.state.toolCallIndex ?? toolCallIndex;
          toolCallId = events.state.toolCallId ?? toolCallId;
          started = events.state.started ?? started;
          if (events.state.inputTokens != null) inputTokens = events.state.inputTokens;
          if (events.state.outputTokens != null) outputTokens = events.state.outputTokens;
          if (events.state.stopReason != null) stopReason = events.state.stopReason;
        }
      } catch (err) {
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        controller.error(err);
      }
    },
    cancel(reason) {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      return reader.cancel(reason);
    },
  });
}

interface OpenAIStreamChunk {
  id?: string;
  object?: string;
  model?: string;
  choices?: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      reasoning_content?: string;
      reasoning?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

type AnthropicStopReason = "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | null;

interface TranslationState {
  messageId: string;
  modelPublicId: string;
  blockIndex: number;
  currentBlockType: "text" | "tool_use" | "thinking" | null;
  toolCallIndex: number;
  toolCallId: string | null;
  started: boolean;
  inputTokens: number;
  outputTokens: number;
  stopReason: AnthropicStopReason;
}

interface TranslationStateUpdate {
  messageId?: string;
  blockIndex?: number;
  currentBlockType?: "text" | "tool_use" | "thinking" | null;
  toolCallIndex?: number;
  toolCallId?: string | null;
  started?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: AnthropicStopReason;
}

function mapFinishReason(reason: string | null): AnthropicStopReason {
  if (reason === "tool_calls") return "tool_use";
  if (reason === "length") return "max_tokens";
  if (reason === "stop") return "end_turn";
  return "end_turn";
}

function translateChunk(
  chunk: OpenAIStreamChunk,
  state: TranslationState,
): { lines: string[]; state: TranslationStateUpdate } {
  const lines: string[] = [];
  const next: TranslationStateUpdate = {};

  const emit = (event: string, data: unknown) =>
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  if (chunk.id) next.messageId = chunk.id;

  // If usage-only chunk (stream_options.include_usage final), record and skip
  if (chunk.usage && (!chunk.choices || chunk.choices.length === 0)) {
    if (chunk.usage.prompt_tokens != null) next.inputTokens = chunk.usage.prompt_tokens;
    if (chunk.usage.completion_tokens != null) next.outputTokens = chunk.usage.completion_tokens;
    return { lines, state: next };
  }

  // Emit message_start on first chunk
  if (!state.started) {
    lines.push(
      emit("message_start", {
        type: "message_start",
        message: {
          id: chunk.id ?? state.messageId,
          type: "message",
          role: "assistant",
          content: [],
          model: chunk.model ?? state.modelPublicId,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      }),
    );
    next.started = true;
  }

  const choice = chunk.choices?.[0];
  if (!choice) return { lines, state: next };

  // Track finish_reason from upstream and map to Anthropic stop_reason
  if (choice.finish_reason) {
    next.stopReason = mapFinishReason(choice.finish_reason);
  }

  const delta = choice.delta ?? {};

  // Reasoning delta (GLM/DeepSeek/Qwen reasoning_content, or `reasoning`) ->
  // Anthropic thinking block, opened before any text block.
  const reasoningText =
    (typeof delta.reasoning_content === "string" ? delta.reasoning_content : "") ||
    (typeof delta.reasoning === "string" ? delta.reasoning : "");
  if (reasoningText.length > 0) {
    if (state.currentBlockType !== "thinking") {
      if (state.currentBlockType != null) {
        lines.push(
          emit("content_block_stop", {
            type: "content_block_stop",
            index: state.blockIndex,
          }),
        );
      }
      const idx = (next.blockIndex ?? state.blockIndex) + 1;
      lines.push(
        emit("content_block_start", {
          type: "content_block_start",
          index: idx,
          content_block: { type: "thinking", thinking: "" },
        }),
      );
      next.blockIndex = idx;
      next.currentBlockType = "thinking";
    }
    lines.push(
      emit("content_block_delta", {
        type: "content_block_delta",
        index: next.blockIndex ?? state.blockIndex,
        delta: { type: "thinking_delta", thinking: reasoningText },
      }),
    );
  }

  // Text delta
  if (typeof delta.content === "string" && delta.content.length > 0) {
    // Start a text block if we're currently in tool_use/thinking or nothing
    if (state.currentBlockType !== "text") {
      // Close previous block if open
      if (state.currentBlockType != null) {
        lines.push(
          emit("content_block_stop", {
            type: "content_block_stop",
            index: state.blockIndex,
          }),
        );
      }
      const idx = state.blockIndex + 1;
      lines.push(
        emit("content_block_start", {
          type: "content_block_start",
          index: idx,
          content_block: { type: "text", text: "" },
        }),
      );
      next.blockIndex = idx;
      next.currentBlockType = "text";
      next.toolCallIndex = -1;
      next.toolCallId = null;
    }
    lines.push(
      emit("content_block_delta", {
        type: "content_block_delta",
        index: state.currentBlockType === "text" ? (next.blockIndex ?? state.blockIndex) : state.blockIndex + 1,
        delta: { type: "text_delta", text: delta.content },
      }),
    );
    // Rough token estimate: ~4 chars/token
    next.outputTokens =
      state.outputTokens + Math.max(1, Math.ceil(delta.content.length / 4));
  }

  // Tool calls
  if (Array.isArray(delta.tool_calls)) {
    for (const tc of delta.tool_calls) {
      if (tc.id && state.toolCallId !== tc.id) {
        // Close previous block if open
        if (state.currentBlockType != null) {
          lines.push(
            emit("content_block_stop", {
              type: "content_block_stop",
              index: state.blockIndex,
            }),
          );
        }
        // Start a new tool_use block — input starts empty, built via input_json_delta
        const idx = (next.blockIndex ?? state.blockIndex) + 1;
        lines.push(
          emit("content_block_start", {
            type: "content_block_start",
            index: idx,
            content_block: {
              type: "tool_use",
              id: tc.id,
              name: tc.function?.name ?? "",
              input: {},
            },
          }),
        );
        next.blockIndex = idx;
        next.currentBlockType = "tool_use";
        next.toolCallIndex = tc.index;
        next.toolCallId = tc.id;
      }
      // Arguments delta (as raw JSON string)
      if (tc.function?.arguments) {
        lines.push(
          emit("content_block_delta", {
            type: "content_block_delta",
            index: next.blockIndex ?? state.blockIndex,
            delta: {
              type: "input_json_delta",
              partial_json: tc.function.arguments,
            },
          }),
        );
      }
    }
  }

  // Emit ping to keep connection alive during reasoning/thinking phases
  if (lines.length === 0 && state.started) {
    lines.push(emit("ping", { type: "ping" }));
  }

  // Final chunk usage override
  if (chunk.usage) {
    if (chunk.usage.prompt_tokens != null) next.inputTokens = chunk.usage.prompt_tokens;
    if (chunk.usage.completion_tokens != null) next.outputTokens = chunk.usage.completion_tokens;
  }

  return { lines, state: next };
}
