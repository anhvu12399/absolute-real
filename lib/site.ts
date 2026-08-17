/**
 * Everything about *which* site this is.
 *
 * The templates, the router and the WordPress bridge are the same code for any
 * site built this way. What differs between one and the next is a handful of
 * facts: the brand's name, where it lives, and which hostnames count as its
 * own. They are collected here, read from the environment, so cloning this
 * front end for another WordPress install is a matter of editing `.env` rather
 * than hunting through forty templates.
 *
 * Values are read at build time (`NEXT_PUBLIC_*`), which is why they are plain
 * constants: a breadcrumb label should not need a network round trip.
 */

const stripSlash = (value: string) => value.replace(/\/+$/, "");

/** Canonical public URL, used for metadata, sitemap and robots. */
export const SITE_URL = stripSlash(process.env.NEXT_PUBLIC_SITE_URL || "https://www.absoluteasiatours.com");

/**
 * The brand as it appears in breadcrumbs and the title template.
 *
 * WordPress also reports a site name, and the header and footer prefer that -
 * it is the one an editor can change without a deploy. This constant covers
 * the places a template has no `site` object to hand.
 */
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Absolute Asia Tours";

/** Short form for breadcrumbs, where the full name is too long to repeat. */
export const BRAND_SHORT = process.env.NEXT_PUBLIC_BRAND_SHORT || BRAND_NAME;

/** Homepage <title> and meta description - the two strings search results show. */
export const SITE_TITLE =
  process.env.NEXT_PUBLIC_SITE_TITLE || `${BRAND_NAME} — Private Luxury Journeys Across Asia`;

export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  `${BRAND_NAME} composes private, tailor-made luxury journeys across Asia for discerning travelers.`;

/**
 * Social profiles for the footer, as `Label|URL` pairs separated by commas:
 *   NEXT_PUBLIC_SOCIALS="Instagram|https://…,Facebook|https://…"
 * Empty means the row is not rendered at all - better than three links to
 * somebody else's accounts.
 */
export const SOCIAL_LINKS = (process.env.NEXT_PUBLIC_SOCIALS || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [label, url] = entry.split("|").map((part) => (part || "").trim());
    return label && url ? { label, url } : null;
  })
  .filter((entry): entry is { label: string; url: string } => Boolean(entry));

/** Sits under the logo in the header. */
export const BRAND_TAGLINE = process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Private | Luxury | Journeys";

/**
 * Hostnames that are this site, whatever the imported HTML says.
 *
 * Content dragged over from a legacy install is full of absolute links to the
 * host it was written on - and often to a sister company's domain too. Any host
 * listed here is rewritten to a local path so a click never leaves the site.
 * Set `NEXT_PUBLIC_LEGACY_HOSTS` to a comma-separated list.
 */
export const INTERNAL_HOSTS: RegExp[] = (() => {
  const hosts = new Set<string>();

  const add = (value?: string | null) => {
    if (!value) return;
    try {
      hosts.add(new URL(value.includes("://") ? value : `https://${value}`).hostname.replace(/^www\./i, ""));
    } catch {
      /* Not a URL - ignore rather than break the build over a typo. */
    }
  };

  add(SITE_URL);
  add(process.env.NEXT_PUBLIC_WP_URL);
  (process.env.NEXT_PUBLIC_LEGACY_HOSTS || "").split(",").forEach((host) => add(host.trim()));

  const patterns = [...hosts].map(
    (host) => new RegExp(`^(?:[a-z0-9-]+\\.)*${host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  );
  patterns.push(/^localhost(?::\d+)?$/i);
  return patterns;
})();

/** True when a URL's hostname belongs to this site. */
export function isInternalHost(hostname: string) {
  return INTERNAL_HOSTS.some((pattern) => pattern.test(hostname));
}

/**
 * True for a WordPress upload served from the public domain itself.
 *
 * That host is being moved from WordPress to this site, and this site serves
 * no /wp-content/ — so such a URL resolves today and 404s the moment DNS
 * changes. Anything matching this must not be rendered or published in schema;
 * uploads on the backend host are unaffected and pass.
 */
export function isDoomedUpload(url?: string | null) {
  if (!url || !url.includes("/wp-content/")) return false;
  const bare = (host: string) => host.replace(/^www\./, "").toLowerCase();
  try {
    return bare(new URL(url).hostname) === bare(new URL(SITE_URL).hostname);
  } catch {
    return false;
  }
}

/**
 * Which logo the header and footer draw.
 *
 * "vector" uses the mark bundled with this code: exact at every size, and
 * immune to the domain move. It is also specific to Absolute Asia, so a sister
 * site built on this repo sets "wordpress" and gets its own logo from the CMS
 * the way it did before. Declared rather than guessed, because guessing which
 * brand a deployment belongs to is how the wrong logo ships.
 */
export const BRAND_LOGO_SOURCE =
  process.env.NEXT_PUBLIC_BRAND_LOGO === "wordpress" ? "wordpress" : "vector";

/**
 * Paths that exist only because WordPress and WooCommerce created them.
 *
 * A cart, a checkout, an order-received page and a "refund and returns"
 * placeholder came across with the import. This site sells nothing: they are
 * empty pages, and they were live, indexable, and listed in the sitemap —
 * which tells Google the company's shopping basket is empty. WordPress's own
 * sample post and page are here for the same reason.
 *
 * Kept reachable rather than redirected: an old link to one should land
 * somewhere rather than 404, it just should not be in an index.
 */
const PRIVATE_PATHS = [
  /^\/(cart|checkout|order-received|refund_returns|refund-returns)\/?$/i,
  /^\/(hello-world|sample-page)\/?$/i,
  /^\/thank-you\/?$/i,
  /^\/my-account\//i,
];

/** True for a page that should carry noindex and stay out of the sitemap. */
export function isPrivatePath(path: string) {
  const clean = path.split("?")[0].split("#")[0];
  return PRIVATE_PATHS.some((re) => re.test(clean));
}

/**
 * Facts about the company behind the site.
 *
 * These were literals scattered through the schema, the footer, the WhatsApp
 * greeting and the llms.txt routes. Two problems with that. The phone number
 * is already served by WordPress, so changing it there left three copies of
 * the old one on the page. And the legal entity is a statement about who is
 * liable — carried into a sister site's codebase unchanged, it publishes one
 * company's registration under another company's name.
 *
 * Empty is the right default: a brand that has not stated its number should
 * print nothing rather than somebody else's.
 */
export const BRAND_PHONE = (process.env.NEXT_PUBLIC_BRAND_PHONE || "").trim();

/** The one-sentence legal footer, e.g. "X is a division of Y (DOS ID: …)." */
export const LEGAL_ENTITY = (process.env.NEXT_PUBLIC_LEGAL_ENTITY || "").trim();

/** How the company describes itself in one line, for schema and llms.txt. */
export const BRAND_SUMMARY = (process.env.NEXT_PUBLIC_BRAND_SUMMARY || SITE_DESCRIPTION).trim();
