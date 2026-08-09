import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * Note: a strict Content-Security-Policy is intentionally not set here yet —
 * it requires nonce wiring for inline scripts/styles and must be tuned per
 * deployment. Tracked as a production-readiness follow-up.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  // Only honored by browsers over HTTPS; harmless in local dev.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Avatar uploads are <= 2MB files as base64 (~2.7MB). Keep headroom small.
    serverActions: { bodySizeLimit: "4mb" },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Rewrite external-facing gateway URLs to internal Next.js route handlers.
  // This lets clients point at the canonical paths:
  //   POST https://your-domain/v1/chat/completions   (OpenAI)
  //   GET  https://your-domain/v1/models             (OpenAI)
  //   POST https://your-domain/v1/messages           (Anthropic / Claude Code)
  // The specific Anthropic rules must come BEFORE the /v1 wildcard so they win.
  async rewrites() {
    return [
      // Anthropic Messages API (Claude Code sets ANTHROPIC_BASE_URL=.../v1 and
      // POSTs {base}/messages -> /v1/messages). Also tolerate a doubled /v1 in
      // case a client appends /v1/messages to a base URL that already ends in /v1.
      {
        source: "/v1/messages",
        destination: "/api/anthropic/v1/messages",
      },
      {
        source: "/v1/v1/messages",
        destination: "/api/anthropic/v1/messages",
      },
      {
        source: "/anthropic/v1/:path*",
        destination: "/api/anthropic/v1/:path*",
      },
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
