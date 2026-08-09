import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.absoluteasiatours.com";
  if (process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/wp-admin/", "/wp-json/", "/api/"] }], sitemap: `${site}/sitemap_index.xml` };
}
