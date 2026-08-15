/**
 * Where WordPress lives, for anything that needs the origin rather than the
 * API.
 *
 * Kept in its own module with no imports so a client component can read it
 * without pulling the fetching layer into the browser bundle. Three consumers
 * used to work this out separately — lib/wp.ts, lib/admin.ts and EditBar — and
 * they disagreed: a deployment that set WORDPRESS_API_URL but not
 * NEXT_PUBLIC_WP_URL fetched content happily while every edit link resolved to
 * an empty string, so the edit bar had nothing to render and stayed invisible
 * no matter what.
 *
 * NEXT_PUBLIC_* is inlined at build time, so a sister site must set it for the
 * browser half to work; the server halves can also use WORDPRESS_API_URL.
 */

const trim = (value: string) => value.replace(/\/+$/, "");

/** Last resort, matching resolveApiBase() so the two cannot drift apart. */
const FALLBACK = "https://backend.absoluteasiatours.com";

export const WP_ORIGIN = trim(
  process.env.NEXT_PUBLIC_WP_URL ||
    process.env.WORDPRESS_ORIGIN ||
    (process.env.WORDPRESS_API_URL || "").replace(/\/wp-json\/?$/, "") ||
    FALLBACK,
);
