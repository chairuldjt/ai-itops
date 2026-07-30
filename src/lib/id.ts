import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a URL-safe, collision-resistant ID with an optional prefix.
 * e.g. createId("user") => "user_V1StGXR8_Z5jdHi6B-myT"
 */
export function createId(prefix: string, size = 22): string {
  const nanoid = customAlphabet(alphabet, size);
  return `${prefix}_${nanoid()}`;
}

/**
 * Generate an API key in the format:  sk_live_<48 chars>
 * The caller should hash this (SHA-256) before storage.
 */
export function generateApiKey(): { key: string; prefix: string } {
  const nanoid = customAlphabet(alphabet, 48);
  const body = nanoid();
  const key = `sk_live_${body}`;
  const prefix = key.slice(0, 12); // "sk_live_" + first 4 chars
  return { key, prefix };
}
