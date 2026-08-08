import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";

  const staticPages = [
    "",
    "/models",
    "/blog",
    "/release-notes",
    "/contact-us",
    "/login",
    "/signup",
  ];

  const docPages = [
    "/docs",
    "/docs/introduction",
    "/docs/quickstart",
    "/docs/openai-setup",
    "/docs/rate-limits",
    "/docs/faq",
    "/docs/privacy-policy",
    "/docs/terms-of-use",
  ];

  const now = new Date().toISOString();

  return [
    ...staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: (path === "" ? "daily" : "weekly") as "daily" | "weekly",
      priority: path === "" ? 1.0 : 0.8,
    })),
    ...docPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
