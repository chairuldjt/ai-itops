/**
 * Canonical AI provider list.
 *
 * `value` is what gets stored in `models.provider` and shown to users.
 * `slug` + `color` map the provider to an official brand mark self-hosted under
 * `public/providers/` (sourced from lobehub/lobe-icons). Mono marks use
 * `currentColor` and are inverted in dark mode; color marks carry their own
 * brand fills.
 */
export interface ProviderDef {
  value: string;
  label: string;
  slug: string;
  color: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  { value: "OpenAI", label: "OpenAI", slug: "openai", color: false },
  { value: "Anthropic", label: "Anthropic", slug: "anthropic", color: false },
  { value: "Gemini", label: "Gemini", slug: "gemini", color: true },
  { value: "DeepSeek", label: "DeepSeek", slug: "deepseek", color: true },
  { value: "Moonshot", label: "Moonshot", slug: "moonshot", color: false },
  { value: "Z.ai", label: "Z.ai", slug: "zai", color: false },
  { value: "Qwen", label: "Qwen", slug: "qwen", color: true },
  { value: "Mistral", label: "Mistral", slug: "mistral", color: true },
  { value: "Meta", label: "Meta", slug: "meta", color: true },
  { value: "xAI", label: "xAI", slug: "xai", color: false },
  { value: "Groq", label: "Groq", slug: "groq", color: false },
  { value: "Cohere", label: "Cohere", slug: "cohere", color: true },
  { value: "Perplexity", label: "Perplexity", slug: "perplexity", color: true },
  { value: "Other", label: "Other", slug: "", color: false },
];

/** Look up a provider by its stored value (case-insensitive). */
export function findProvider(
  value: string | null | undefined,
): ProviderDef | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return PROVIDERS.find((p) => p.value.toLowerCase() === v);
}

/** Public path of a provider's brand mark, or null when it has none. */
export function providerLogoSrc(
  value: string | null | undefined,
): string | null {
  const def = findProvider(value);
  if (!def || !def.slug) return null;
  return `/providers/${def.slug}${def.color ? "-color" : ""}.svg`;
}
