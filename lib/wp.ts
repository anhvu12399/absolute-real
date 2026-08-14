import { cache } from "react";
import type { ContentRecord, SeoData } from "./types";
import { localizeHtmlLinks } from "./links";
import { BRAND_NAME, SITE_URL } from "./site";

export const API = resolveApiBase();
const SITE = SITE_URL;

/**
 * WORDPRESS_API_URL wins; NEXT_PUBLIC_WP_URL is what the local docker backend
 * is addressed by, so it is honoured before falling back to the live origin.
 */
function resolveApiBase() {
  const explicit = process.env.WORDPRESS_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const wpUrl = process.env.NEXT_PUBLIC_WP_URL;
  if (wpUrl) return `${wpUrl.replace(/\/$/, "")}/wp-json`;
  return "https://backend.absoluteasiatours.com/wp-json";
}

/**
 * Some origins serve per-host content and need the public hostname spelled out
 * in the request; a local backend 404s on a spoofed Host. Set
 * WORDPRESS_HOST_HEADER only when the origin actually requires it.
 */
function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const host = process.env.WORDPRESS_HOST_HEADER;
  if (host) headers.Host = host;
  return headers;
}

async function wpFetch<T>(path: string, revalidate = 900): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    next: { revalidate, tags: ["wordpress"] },
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error(`WordPress request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export type MenuItem = {
  id: number;
  parent: number;
  title: string;
  url: string;
  target: string;
  classes: string[];
  order: number;
};

export type SitePayload = {
  name: string;
  description: string;
  url: string;
  logo: string;
  phoneLabel: string;
  phone: string;
  email?: string;
  /** Promises the whole site makes, held once on the homepage. */
  whyTitle?: string;
  whyReasons?: Array<{ icon?: string; text?: string }>;
  menu: MenuItem[];
  footerMenu?: MenuItem[];
  frontPage: ContentRecord | null;
};

export async function getSiteData() {
  return wpFetch<SitePayload>("/absolute-asia/v1/site", 300);
}

/** Layout-safe variant: a backend hiccup must not blank the whole site chrome. */
export const getSiteDataSafe = cache(async (): Promise<SitePayload | null> => {
  try {
    return await getSiteData();
  } catch {
    return null;
  }
});

export async function getContentBatch(ids: number[]) {
  if (!ids.length) return [];
  const items = await wpFetch<BridgeItem[]>(`/absolute-asia/v1/content-batch?include=${ids.join(",")}`, 300);
  return items.map(normalize);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
  lt: "<", gt: ">", deg: "°", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
};

/** WordPress returns rendered HTML; card and title slots want plain text. */
/**
 * Turns WordPress's escaped text into what a reader should see.
 *
 * Exported because page metadata needs it too: a title left as
 * "Thailand Honeymoon &#038; Romance" reaches the browser tab and the search
 * result exactly like that.
 */
export function decodeEntities(value = "") {
  return decode(value);
}

function decode(value = "") {
  let text = value.replace(/<[^>]+>/g, "");

  /* Entities arrive double-encoded from WordPress: the stored excerpt already
     holds "&hellip;" as text, and the REST layer escapes the ampersand again.
     One pass turns "&amp;hellip;" into "&hellip;" and stops, which is how a
     literal &hellip; and &#038; reached the cards. Decode until it settles. */
  for (let pass = 0; pass < 3; pass++) {
    const before = text;
    text = text
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
    if (text === before) break;
  }

  return text
    .replace(/\s+/g, " ")
    .trim()
    // Auto-excerpts end with a bracketed ellipsis; the UI adds its own.
    .replace(/\s*\[\s*…\s*\]\s*$/, "…");
}

function localPath(link: string) {
  try {
    const url = new URL(link);
    return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  } catch {
    return "/";
  }
}

type BridgeItem = Omit<Partial<ContentRecord>, "title" | "excerpt" | "content"> & {
  link?: string;
  title?: string | { rendered?: string };
  excerpt?: string | { rendered?: string };
  content?: string | { rendered?: string };
};

/**
 * Collapses one layer of over-escaping.
 *
 * WordPress stores "&#038;" in the field and the REST layer escapes the
 * ampersand on the way out, so the browser is handed "&amp;#038;" and shows the
 * entity as literal text. Markup keeps its remaining single-encoded entities -
 * those are correct HTML.
 */
function unescapeOnce(value: string) {
  return value.replace(/&amp;(#\d+;|#x[0-9a-f]+;|[a-z]+;)/gi, "&$1");
}

/**
 * ACF fields hold rendered HTML too, so their links need the same treatment -
 * and their entities. A field printed as text needs decoding outright; a field
 * printed as markup only needs the double-escaping undone.
 */
function localizeAcf<T>(value: T): T {
  if (typeof value === "string") {
    const fixed = value.includes("<") ? unescapeOnce(value) : decode(value);
    return localizeHtmlLinks(fixed) as unknown as T;
  }
  if (Array.isArray(value)) return value.map(localizeAcf) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, localizeAcf(item)]),
    ) as unknown as T;
  }
  return value;
}

function normalize(item: BridgeItem): ContentRecord {
  const title = typeof item.title === "string" ? item.title : item.title?.rendered;
  const excerpt = typeof item.excerpt === "string" ? item.excerpt : item.excerpt?.rendered;
  const content = typeof item.content === "string" ? item.content : item.content?.rendered;
  // Imported bodies still link to the legacy host; keep every click on this site.
  const localContent = localizeHtmlLinks(content);
  return {
    id: item.id || 0,
    type: item.type || "page",
    slug: item.slug || "",
    path: item.path || localPath(item.link || SITE),
    status: item.status || "publish",
    title: decode(title),
    // Every consumer renders the excerpt as text, so hand it over already clean.
    excerpt: decode(excerpt),
    content: localContent,
    date: item.date || "",
    modified: item.modified || "",
    template: item.template,
    featuredMedia: item.featuredMedia,
    breadcrumbs: item.breadcrumbs,
    /* The bridge resolves both of these, and templates depend on them: `terms`
       carries the country a page belongs to, `related` the tours, stays and
       experiences an editor picked. Dropping them here left every related strip
       and every country lookup empty. */
    terms: item.terms || [],
    /* Related records carry the same escaped titles and excerpts as the parent,
       and every template prints them straight into a card. */
    related: item.related
      ? (Object.fromEntries(
          Object.entries(item.related).map(([key, list]) => [
            key,
            Array.isArray(list)
              ? list.map((row) =>
                  row && typeof row === "object"
                    ? { ...row, title: decode((row as { title?: string }).title), excerpt: decode((row as { excerpt?: string }).excerpt) }
                    : row,
                )
              : list,
          ]),
        ) as ContentRecord["related"])
      : undefined,
    acf: localizeAcf(item.acf || {}),
    seo: item.seo || {},
  };
}

export const getContentByPath = cache(async (pathname: string) => {
  const path = pathname === "" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}/`;
  try {
    const item = await wpFetch<BridgeItem>(`/absolute-asia/v1/content?path=${encodeURIComponent(path)}`);
    return normalize(item);
  } catch {
    const slug = path === "/" ? "home" : path.split("/").filter(Boolean).at(-1)!;
    const types = ["pages", "posts", "tour", "hotel", "travel_guide", "place_to_go", "thing_to_do", "blog"];
    for (const type of types) {
      try {
        const items = await wpFetch<BridgeItem[]>(`/wp/v2/${type}?slug=${encodeURIComponent(slug)}&_embed=1&per_page=10`);
        const exact = items.find((item) => localPath(item.link || "") === path);
        if (exact) return normalize(exact);
      } catch {}
    }
    return null;
  }
});

export async function getSeo(path: string, fallback?: SeoData) {
  try {
    const head = await wpFetch<{ head_json?: Record<string, unknown> }>(
      `/rankmath/v1/getHead?url=${encodeURIComponent(`${SITE}${path}`)}`,
    );
    const json = head.head_json || {};
    return {
      ...fallback,
      title: String(json.title || fallback?.title || BRAND_NAME),
      description: String(json.description || fallback?.description || ""),
      canonical: String(json.canonical || `${SITE}${path}`),
      robots: json.robots as SeoData["robots"],
      openGraph: json.open_graph as SeoData["openGraph"],
      schema: json.schema,
    } satisfies SeoData;
  } catch {
    return fallback || {};
  }
}

export async function searchContent(query: string) {
  if (!query.trim()) return [];
  try {
    const items = await wpFetch<BridgeItem[]>(`/absolute-asia/v1/search?q=${encodeURIComponent(query)}`, 60);
    return items.map(normalize);
  } catch {
    return [];
  }
}

/* ── Archive (category listing) ── */

export type ArchiveItem = {
  id: number;
  type: string;
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  date: string;
  featuredMedia: { url: string; width: number; height: number; alt: string } | null;
  /** Present from bridge 2.0 onwards. */
  duration?: string;
  price?: string;
  categories?: Array<{ id: number; name: string; slug: string; path: string | null; taxonomy?: string }>;
  acf: Record<string, unknown>;
};

export type ArchiveResult = {
  items: ArchiveItem[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
};

/**
 * Puts illustrated entries first, keeping their order within each group.
 *
 * Some posts have no photograph on the legacy site either, and a showcase strip
 * that leads with a blank plate reads as broken rather than sparse. Full
 * listings should show everything; only curated strips call this.
 */
export function illustratedFirst(items: ArchiveItem[]): ArchiveItem[] {
  const hasImage = (item: ArchiveItem) =>
    Boolean(item.featuredMedia?.url || (item.acf as Record<string, unknown>)?.hero_image);
  return [...items.filter(hasImage), ...items.filter((item) => !hasImage(item))];
}

/**
 * Archive lookup that never throws.
 *
 * The bridge `/archive` route only exists from plugin 2.0; against an older
 * backend this falls back to core `/wp/v2/<type>` so listings still fill.
 */
export async function getArchiveSafe(opts: Parameters<typeof getArchive>[0]): Promise<ArchiveItem[]> {
  try {
    /* An empty answer is an answer. Falling through on it meant that a country
       with no hotels of its own was handed twelve hotels from anywhere - which
       is how Thailand ended up showing Vietnam. The fallback exists for a
       bridge that is missing, not for a query that legitimately matched
       nothing. */
    return (await getArchive(opts)).items || [];
  } catch {
    /* fall through to the core REST API */
  }

  /* The core API cannot be given the same taxonomy filter without resolving the
     term id first, so a filtered query returns nothing rather than the wrong
     country's content. */
  if (opts.taxonomy && opts.term) return [];

  const types = (opts.type || "post").split(",").map((type) => type.trim()).filter(Boolean);
  const perPage = opts.perPage || 12;
  const batches = await Promise.all(
    types.map(async (type) => {
      try {
        const items = await wpFetch<BridgeItem[]>(`/wp/v2/${type}?per_page=${perPage}&_embed=1`, 300);
        return items.map(toArchiveItem);
      } catch {
        return [];
      }
    }),
  );
  return batches.flat().slice(0, perPage);
}

type EmbeddedItem = BridgeItem & {
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string; alt_text?: string; media_details?: { width?: number; height?: number } }>;
    "wp:term"?: Array<Array<{ id: number; name: string; slug: string; link?: string }>>;
  };
};

function toArchiveItem(item: BridgeItem): ArchiveItem {
  const record = normalize(item);
  const media = (item as EmbeddedItem)._embedded?.["wp:featuredmedia"]?.[0];
  const terms = ((item as EmbeddedItem)._embedded?.["wp:term"] || []).flat();
  return {
    id: record.id,
    type: record.type,
    slug: record.slug,
    path: record.path,
    title: record.title,
    excerpt: decode(record.excerpt),
    date: record.date,
    featuredMedia: media?.source_url
      ? {
          url: media.source_url,
          width: media.media_details?.width || 0,
          height: media.media_details?.height || 0,
          alt: media.alt_text || record.title,
        }
      : null,
    categories: terms.map((term) => ({
      id: term.id,
      name: decode(term.name),
      slug: term.slug,
      path: term.link ? localPath(term.link) : null,
    })),
    acf: record.acf || {},
  };
}

export async function getArchive(opts: {
  type?: string;
  category?: string;
  taxonomy?: string;
  term?: string;
  page?: number;
  perPage?: number;
}): Promise<ArchiveResult> {
  const params = new URLSearchParams();
  if (opts.type) params.set("type", opts.type);
  if (opts.category) params.set("category", opts.category);
  if (opts.taxonomy) params.set("taxonomy", opts.taxonomy);
  if (opts.term) params.set("term", opts.term);
  params.set("page", String(opts.page || 1));
  params.set("per_page", String(opts.perPage || 50));
  const result = await wpFetch<ArchiveResult>(`/absolute-asia/v1/archive?${params}`, 300);

  /* The archive was handed to the templates exactly as WordPress escaped it -
     this endpoint never went through normalize(), which is why "&#038;" and
     "[&hellip;]" showed up on every card while single pages were clean. */
  return {
    ...result,
    items: (result.items || []).map((item) => ({
      ...item,
      title: decode(item.title),
      excerpt: decode(item.excerpt),
      duration: item.duration ? decode(item.duration) : item.duration,
      price: item.price ? decode(item.price) : item.price,
      categories: item.categories?.map((term) => ({ ...term, name: decode(term.name) })),
      acf: slimAcf(localizeAcf(item.acf || {})),
    })),
  };
}

/**
 * The handful of ACF keys a card actually reads.
 *
 * An archive item arrives at ~7KB, of which 6.1KB is ACF that no card renders -
 * full itineraries, FAQs, galleries. Every one of those bytes is serialized
 * into the RSC payload because the templates are client components, which put
 * 235KB of dead weight in the homepage document. Anything a card genuinely
 * needs is listed here; the rest is dropped before it crosses the boundary.
 */
const CARD_ACF_KEYS = [
  "hotel_highlights", "latitude", "longitude", "location_map",
  "itinerary", "read_minutes", "duration_label", "hero_image",
];

function slimAcf(acf: Record<string, unknown>): Record<string, unknown> {
  const slim: Record<string, unknown> = {};
  for (const key of CARD_ACF_KEYS) {
    if (acf[key] !== undefined && acf[key] !== "" && acf[key] !== null) slim[key] = acf[key];
  }
  return slim;
}

/* ── Category / Term info ── */

export type TermInfo = {
  id: number;
  taxonomy: string;
  slug: string;
  name: string;
  description: string;
  count: number;
  parent: number;
  path: string | null;
  /** Present from bridge 2.0: region grouping and an optional term image. */
  region?: string;
  image?: string;
  /** Opening line set on the country term, for countries with no page. */
  intro?: string;
  /** A legacy category filed under `country` that is not one, e.g. Asia Cruises. */
  notACountry?: boolean;
  acf: Record<string, unknown>;
};

/**
 * Terms that name a real country.
 *
 * The legacy site's categories were mirrored into the `country` taxonomy, which
 * swept in "Asia Cruises" and "Bali (Indonesia)". Their archives still resolve -
 * the URLs are indexed - but they must not sit in a grid of countries.
 */
export function realCountries(terms: TermInfo[]): TermInfo[] {
  return terms.filter((term) => !term.notACountry);
}

/** Terms of one taxonomy, empty instead of throwing. */
export async function getTermsSafe(taxonomy: string): Promise<TermInfo[]> {
  try {
    return await wpFetch<TermInfo[]>(`/absolute-asia/v1/terms?taxonomy=${encodeURIComponent(taxonomy)}`, 600);
  } catch {
    return [];
  }
}

export async function getTermBySlug(slug: string, taxonomy = "category"): Promise<TermInfo | null> {
  try {
    const terms = await wpFetch<TermInfo[]>(
      `/absolute-asia/v1/terms?taxonomy=${taxonomy}`,
      600,
    );
    return terms.find((t) => t.slug === slug) || null;
  } catch {
    return null;
  }
}

/* ── Image metadata resolver ── */

export type ImageMeta = { id: number; url: string; width: number; height: number; alt: string; mime: string };

export async function resolveImages(urls: string[]): Promise<Record<string, ImageMeta>> {
  if (!urls.length) return {};
  try {
    return await wpFetch<Record<string, ImageMeta>>(
      `/absolute-asia/v1/images?urls=${encodeURIComponent(urls.join(","))}`,
      3600,
    );
  } catch {
    return {};
  }
}
