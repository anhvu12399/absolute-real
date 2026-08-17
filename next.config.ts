import type { NextConfig } from "next";

/* The WordPress origin this site proxies wp-admin and uploads to. */
const origin = process.env.WORDPRESS_ORIGIN || process.env.NEXT_PUBLIC_WP_URL || "";

/* Hosts allowed to serve <Image> sources: the WordPress install plus any legacy
   domain still referenced by imported content. Configured, not spelled out. */
const imageHosts = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_WP_URL,
  origin,
  ...(process.env.NEXT_PUBLIC_LEGACY_HOSTS || "").split(","),
]
  .map((value) => (value || "").trim())
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value.includes("://") ? value : `https://${value}`).hostname;
    } catch {
      return "";
    }
  })
  .filter(Boolean)
  .flatMap((host) => [host, host.startsWith("www.") ? host.slice(4) : `www.${host}`]);

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  trailingSlash: true,
  images: {
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1600, 1920, 2048],
    /* Backgrounds ask the optimizer for these widths by hand - see lib/images.ts. */
    imageSizes: [384, 640],
    qualities: [75, 80, 85],
    /* WordPress uploads never change under the same URL, so they can be cached
       for a year rather than the 60-second default. */
    minimumCacheTTL: 31536000,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...[...new Set(imageHosts)].map((hostname) => ({ protocol: "https" as const, hostname })),
      { protocol: "https", hostname: "backend.absoluteasiatours.com" },
      { protocol: "https", hostname: "www.absoluteasiatours.com" },
      { protocol: "https", hostname: "absoluteasiatours.com" },
      { protocol: "https", hostname: "amazingbiketours.com" },
    ],
  },
  async redirects() {
    /* Legacy URLs that no longer have a record of their own.
     *
     * Everything else keeps its original path: the router resolves posts by the
     * path WordPress reports, so /places-to-go/hoi-an/ and friends do not need
     * an entry here - and must not have one, because a redirect to a path the
     * router cannot serve turns an indexed page into a 404. */
    return [
      {
        // Empty duplicate left by a repeated legacy import.
        source: "/collection/rosewood-phuket-6/",
        destination: "/collection/rosewood-phuket/",
        permanent: true,
      },
      /* Post-type archives the legacy site published and Google still has
         indexed. This site groups the same content differently, so each one
         points at the page that now does its job rather than 404ing. Checked
         against the old sitemap: these were the only three of 670 indexed
         URLs with nowhere to land. */
      { source: "/places-to-go", destination: "/destinations/", permanent: true },
      { source: "/places-to-go/", destination: "/destinations/", permanent: true },
      { source: "/travel-guides", destination: "/inspirations/", permanent: true },
      { source: "/travel-guides/", destination: "/inspirations/", permanent: true },
      { source: "/things-to-do", destination: "/inspirations/", permanent: true },
      { source: "/things-to-do/", destination: "/inspirations/", permanent: true },
      /* Auto-correct mistyped /asledit=1/ without question mark */
      { source: "/asledit=1", destination: "/?asledit=1", permanent: false },
      { source: "/asledit=1/", destination: "/?asledit=1", permanent: false },
      { source: "/asledit=0", destination: "/?asledit=0", permanent: false },
      { source: "/asledit=0/", destination: "/?asledit=0", permanent: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/wp-admin/:path*", destination: `${origin}/wp-admin/:path*` },
        { source: "/wp-login.php", destination: `${origin}/wp-login.php` },
        { source: "/wp-json/:path*", destination: `${origin}/wp-json/:path*` },
        { source: "/wp-content/uploads/:path*", destination: `${origin}/wp-content/uploads/:path*` },
        { source: "/wp-content/themes/:path*", destination: `${origin}/wp-content/themes/:path*` },
        { source: "/wp-content/plugins/:path*", destination: `${origin}/wp-content/plugins/:path*` },
        { source: "/wp-includes/:path*", destination: `${origin}/wp-includes/:path*` },
        { source: "/cdn-cgi/:path*", destination: `${origin}/cdn-cgi/:path*` },
        { source: "/sitemap_index.xml", destination: `${origin}/sitemap_index.xml` },
        { source: "/:name*-sitemap.xml", destination: `${origin}/:name*-sitemap.xml` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/wp-admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
