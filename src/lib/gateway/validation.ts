import { z } from "zod";

const TEXT_MAX = 200_000;
const DATA_MAX = 700_000;
const URL_MAX = 200_000;
const MESSAGES_MAX = 256;
const TOOLS_MAX = 128;
const VALUE_BYTES_MAX = 200_000;
const finite = (min: number, max: number) => z.number().finite().min(min).max(max);
const text = z.string().max(TEXT_MAX);
const knownOpenAI = new Set(["text", "image_url", "input_audio"]);

function bounded(value: unknown, depth = 0): boolean {
  if (depth > 4) return false;
  if (typeof value === "string") return value.length <= VALUE_BYTES_MAX;
  if (value == null || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length <= 128 && value.every((item) => bounded(item, depth + 1));
  if (typeof value !== "object") return false;
  const entries = Object.entries(value);
  return entries.length <= 128 && entries.every(([key, item]) => key.length <= 256 && bounded(item, depth + 1));
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
