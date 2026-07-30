import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Useful for streaming route handlers that return ReadableStream.
    serverActions: { bodySizeLimit: "10mb" },
  },

  // Rewrite external-facing gateway URLs to internal Next.js route handlers.
  // This lets clients point at the canonical paths:
  //   POST https://your-domain/v1/chat/completions
  //   GET  https://your-domain/v1/models
  //   POST https://your-domain/anthropic/v1/messages
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
      {
        source: "/anthropic/v1/:path*",
        destination: "/api/anthropic/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
