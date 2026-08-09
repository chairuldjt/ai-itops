import { z } from "zod";

// Claude Code sends large, deeply-nested requests (many tools with JSON
// schemas, long conversations). Keep these limits generous so legitimate
// requests aren't rejected; parseJsonBody still caps total body size.
const TEXT_MAX = 2_000_000;
const DATA_MAX = 20_000_000;
const URL_MAX = 2_000_000;
const MESSAGES_MAX = 2048;
const TOOLS_MAX = 512;
const VALUE_BYTES_MAX = 2_000_000;
const finite = (min: number, max: number) => z.number().finite().min(min).max(max);
const text = z.string().max(TEXT_MAX);
const knownOpenAI = new Set(["text", "image_url", "input_audio"]);
const knownAnthropic = new Set(["text", "image", "tool_use", "tool_result"]);

function bounded(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (typeof value === "string") return value.length <= VALUE_BYTES_MAX;
  if (value == null || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length <= 1024 && value.every((item) => bounded(item, depth + 1));
  if (typeof value !== "object") return false;
  const entries = Object.entries(value);
  return entries.length <= 1024 && entries.every(([key, item]) => key.length <= 256 && bounded(item, depth + 1));
}

const fallback = (known: Set<string>) => z.object({ type: z.string().min(1).max(100) }).passthrough().refine((value) => !known.has(value.type) && bounded(value));
const imageUrl = z.object({ url: z.string().min(1).max(URL_MAX), detail: z.string().max(20).optional() }).passthrough();
const openAIContentPart = z.union([
  z.object({ type: z.literal("text"), text }).passthrough(),
  z.object({ type: z.literal("image_url"), image_url: imageUrl }).passthrough(),
  z.object({ type: z.literal("input_audio"), input_audio: z.object({ data: z.string().max(DATA_MAX), format: z.string().min(1).max(20) }).passthrough() }).passthrough(),
  fallback(knownOpenAI),
]);
const openAIMessage = z.object({
  role: z.enum(["system", "user", "assistant", "tool", "developer", "function"]),
  content: z.union([text, z.array(openAIContentPart).min(1).max(64), z.null()]).optional(),
  name: z.string().min(1).max(256).optional(),
  tool_call_id: z.string().min(1).max(256).optional(),
  tool_calls: z.array(z.unknown()).max(TOOLS_MAX).refine(bounded).optional(),
}).passthrough();
const tools = z.array(z.unknown()).max(TOOLS_MAX).refine(bounded).optional();

export const openAIChatRequestSchema = z.object({
  model: z.string().trim().min(1).max(256), messages: z.array(openAIMessage).min(1).max(MESSAGES_MAX), stream: z.boolean().optional(),
  max_tokens: z.number().int().positive().max(1_000_000).optional(), max_completion_tokens: z.number().int().positive().max(1_000_000).optional(),
  temperature: finite(0, 2).optional(), top_p: finite(0, 1).optional(), frequency_penalty: finite(-2, 2).optional(), presence_penalty: finite(-2, 2).optional(),
  n: z.number().int().positive().max(16).optional(), seed: z.number().int().min(-2_147_483_648).max(2_147_483_647).optional(),
  stop: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(16)]).optional(), tools, tool_choice: z.unknown().refine(bounded).optional(), response_format: z.unknown().refine(bounded).optional(),
}).passthrough();

/* -------------------------------------------------------------------------- */
/*                        Anthropic Messages API schema                       */
/* -------------------------------------------------------------------------- */

const anthropicText = z.object({ type: z.literal("text"), text }).passthrough();
const anthropicImage = z.object({ type: z.literal("image"), source: z.discriminatedUnion("type", [
  z.object({ type: z.literal("base64"), media_type: z.string().min(1).max(100), data: z.string().max(DATA_MAX) }).passthrough(),
  z.object({ type: z.literal("url"), url: z.string().min(1).max(URL_MAX) }).passthrough(),
]) }).passthrough();
const toolUse = z.object({ type: z.literal("tool_use"), id: z.string().min(1).max(256), name: z.string().min(1).max(256), input: z.unknown().refine(bounded) }).passthrough();
const nestedPart: z.ZodType = z.lazy(() => z.union([anthropicText, fallback(knownAnthropic)]));
const toolResult = z.object({ type: z.literal("tool_result"), tool_use_id: z.string().min(1).max(256), content: z.union([text, z.array(nestedPart).max(512)]) }).passthrough();
const anthropicPart = z.union([anthropicText, anthropicImage, toolUse, toolResult, fallback(knownAnthropic)]);

// NOTE: `role` is accepted as any non-empty string (not just user/assistant).
// Claude Code and other clients occasionally emit other roles; anthropicToOpenAI
// translates user/assistant and safely skips anything else. Being strict here
// previously surfaced as 400 "Invalid option: expected one of user|assistant".
export const anthropicRequestSchema = z.object({
  model: z.string().trim().min(1).max(256), max_tokens: z.number().int().positive().max(1_000_000).optional(),
  messages: z.array(z.object({ role: z.string().min(1).max(64), content: z.union([text, z.array(anthropicPart).min(1).max(512)]) }).passthrough()).min(1).max(MESSAGES_MAX),
  system: z.union([text, z.array(z.union([anthropicText, fallback(knownAnthropic)])).max(128)]).optional(), tools, stream: z.boolean().optional(),
  temperature: finite(0, 1).optional(), top_p: finite(0, 1).optional(), top_k: z.number().int().positive().max(1_000_000).optional(), stop_sequences: z.array(z.string().max(1000)).max(16).optional(),
}).passthrough();
