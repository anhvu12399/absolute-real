import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware Strategy (Full Next.js with WordPress fallback)
 * ──────────────────────────────────────────────────────────
 * ALL pages attempt native Next.js rendering first via [[...slug]]/page.tsx.
 * If the native page calls notFound(), Next.js will show the 404 page.
 * 
 * However, we need the legacy proxy for pages that the WP content API
 * doesn't serve (taxonomy archives, custom template pages, etc.).
 * 
 * Strategy: The [[...slug]]/page.tsx will handle the fallback internally
 * by fetching WordPress HTML when getContentByPath() returns null.
 * This middleware simply passes everything through to Next.js.
 */

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
  return /sitemap.*\.xml$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPassthrough(pathname)) return NextResponse.next();

  // Everything goes to native Next.js router app/[[...slug]]/page.tsx
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
