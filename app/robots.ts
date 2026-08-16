import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = SITE_URL;
  if (process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  /* `/sitemap_index.xml` is what the old WordPress install served. This site
     generates app/sitemap.ts, which Next publishes at /sitemap.xml — so the
     address advertised here returned 404 to every crawler that followed it. */
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/wp-admin/", "/wp-json/", "/api/"] }], sitemap: `${site}/sitemap.xml` };
}
