import { NextRequest, NextResponse } from "next/server";

/**
 * Paths served by native Next.js templates. Everything else is rewritten to
 * /legacy/*, where the existing route handler proxies WordPress-rendered HTML.
 *
 * This is what makes the migration incremental: one template moves at a time and
 * the rest of the site keeps working untouched, so WordPress remains the place
 * content is edited throughout. Add a path here only after its native template
 * has passed visual comparison against production.
 *
 * Note on ordering: middleware runs BEFORE the rewrites in next.config.ts, so
 * WordPress asset and admin paths must be excluded here or they would be sent to
 * /legacy and never reach their rewrite.
 */
const NATIVE_PATHS = new Set(["/"]);

const PASSTHROUGH = [
  "/_next",
  "/api",
  "/wp-admin",
  "/wp-login.php",
  "/wp-json",
  "/wp-content",
  "/wp-includes",
  "/cdn-cgi",
  "/favicon.ico",
  "/robots.txt",
];

function isPassthrough(pathname: string) {
  if (PASSTHROUGH.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
  // Yoast/Rank Math sitemaps are rewritten to WordPress in next.config.ts.
  return /sitemap.*\.xml$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPassthrough(pathname)) return NextResponse.next();

  // trailingSlash: true means paths arrive with a trailing slash; compare both.
  const normalised = pathname.length > 1 ? pathname.replace(/\/$/, "") || "/" : "/";
  if (NATIVE_PATHS.has(pathname) || NATIVE_PATHS.has(normalised)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/legacy${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
