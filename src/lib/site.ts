/**
 * Canonical app base URL helpers.
 *
 * `NEXT_PUBLIC_APP_URL` is the single source of truth for the app's public
 * origin. Everything that displays or derives a URL (docs snippets, hero
 * example, auth base URLs) should go through these helpers instead of
 * hardcoding hosts.
 */

const DEFAULT_BASE_URL = "http://localhost:9003";

/** Public origin without trailing slash, e.g. `https://gw.example.com`. */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_BASE_URL;
  return raw.trim().replace(/\/+$/, "");
}

/** Host (with port) of the base URL, e.g. `gw.example.com` or `localhost:9003`. */
export function getAppHost(): string {
  try {
    return new URL(getAppBaseUrl()).host;
  } catch {
    return "localhost:9003";
  }
}

/** Host without port — suitable for deriving email domains. */
export function getAppEmailDomain(): string {
  return getAppHost().replace(/:\d+$/, "");
}
