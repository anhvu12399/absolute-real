/**
 * Link normaliser.
 *
 * Content imported from a legacy install still carries absolute URLs
 * (https://www.example.com/japan/), and the WordPress backend returns its own
 * host. Both must render as local paths or every click leaves the site.
 *
 * Which hosts count as "ours" is configuration, not code - see lib/site.ts and
 * `NEXT_PUBLIC_LEGACY_HOSTS`. That includes a sister company's domain when the
 * imported articles link out to one: those paths mirror this site's own, so
 * they are pulled back in-house rather than sending a reader off mid-article.
 * Brand *names* inside the prose are never touched here - they can appear
 * inside customer reviews, and rewriting a quote would falsify it.
 */

import { INTERNAL_HOSTS, isInternalHost } from "./site";

/** `href="https://any-of-our-hosts/path"` -> `href="/path"`. */
const ABSOLUTE_HREF = /href=("|')(https?:)?\/\/([^/"']+)([^"']*)\1/gi;

/**
 * Rewrites legacy links inside rendered post HTML.
 *
 * Image `src` is left alone - those must keep pointing at the WordPress host.
 */
export function localizeHtmlLinks(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(ABSOLUTE_HREF, (match, quote, _protocol, host, path) =>
      isInternalHost(String(host)) ? `href=${quote}${path || "/"}${quote}` : match,
    )
    /* Now internal, so a new tab is wrong. */
    .replace(/(<a\b[^>]*href=("|')\/[^"']*\2[^>]*)\s+target=("|')_blank\3/gi, "$1")
    .replace(/(<a\b[^>]*href=("|')\/[^"']*\2[^>]*)\s+rel=("|')[^"']*noopener[^"']*\3/gi, "$1");
}

export function toLocalHref(value?: string | null, fallback = "#"): string {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (!isInternalHost(url.hostname)) return raw;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path || "/";
  } catch {
    // Not a URL at all - treat it as a path fragment.
    return raw.startsWith("http") ? fallback : `/${raw.replace(/^\/+/, "")}`;
  }
}

export { INTERNAL_HOSTS };
