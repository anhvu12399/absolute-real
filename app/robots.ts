import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = SITE_URL;
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/wp-admin/", "/wp-json/", "/api/"],
      },
      /* Explicitly welcome AI & Generative Search Engines (ChatGPT, Gemini, Claude, Perplexity, Apple, Meta) */
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "GoogleOther",
          "ClaudeBot",
          "anthropic-ai",
          "PerplexityBot",
          "Applebot-Extended",
          "Applebot",
          "meta-externalagent",
          "cohere-ai",
          "CCBot",
          "Diffbot",
          "Bytespider",
        ],
        allow: "/",
        disallow: ["/wp-admin/", "/wp-json/", "/api/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
