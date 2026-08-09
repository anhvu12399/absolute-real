import { cache } from "react";
import type { ContentRecord, SeoData } from "./types";

const API = (process.env.WORDPRESS_API_URL || "https://origin.absoluteasiatours.com/wp-json").replace(/\/$/, "");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.absoluteasiatours.com").replace(/\/$/, "");

async function wpFetch<T>(path: string, revalidate = 900): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    next: { revalidate, tags: ["wordpress"] },
    headers: { Accept: "application/json", Host: "www.absoluteasiatours.com" },
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
  menu: MenuItem[];
  frontPage: ContentRecord;
  footer: Record<string, string>;
};

export async function getSiteData() {
  return wpFetch<SitePayload>("/absolute-asia/v1/site", 60);
}

export async function getContentBatch(ids: number[]) {
  if (!ids.length) return [];
  const items = await wpFetch<BridgeItem[]>(`/absolute-asia/v1/content-batch?include=${ids.join(",")}`, 60);
  return items.map(normalize);
}

function decode(value = "") {
  return value
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
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

function normalize(item: BridgeItem): ContentRecord {
  const title = typeof item.title === "string" ? item.title : item.title?.rendered;
  const excerpt = typeof item.excerpt === "string" ? item.excerpt : item.excerpt?.rendered;
  const content = typeof item.content === "string" ? item.content : item.content?.rendered;
  return {
    id: item.id || 0,
    type: item.type || "page",
    slug: item.slug || "",
    path: item.path || localPath(item.link || SITE),
    status: item.status || "publish",
    title: decode(title),
    excerpt: excerpt || "",
    content: content || "",
    date: item.date || "",
    modified: item.modified || "",
    template: item.template,
    featuredMedia: item.featuredMedia,
    breadcrumbs: item.breadcrumbs,
    acf: item.acf || {},
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
    const types = ["pages", "posts", "travel-guides", "places-to-go", "hotels", "things-to-do", "blogs", "trip"];
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
      title: String(json.title || fallback?.title || "Absolute Asia Tours"),
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
