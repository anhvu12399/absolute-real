import type { NextConfig } from "next";

const origin = process.env.WORDPRESS_ORIGIN || "https://origin.absoluteasiatours.com";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  trailingSlash: true,
  images: {
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1600, 1920],
    remotePatterns: [
      { protocol: "https", hostname: "www.absoluteasiatours.com" },
      { protocol: "https", hostname: "absoluteasiatours.com" },
      { protocol: "https", hostname: "amazingbiketours.com" },
    ],
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
