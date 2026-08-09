import { cache } from "react";
import type { ContentRecord, FeaturedMedia } from "./types";

const API = (process.env.WORDPRESS_API_URL || "https://origin.absoluteasiatours.com/wp-json").replace(/\/$/, "");

async function api<T>(path: string, revalidate = 300): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    next: { revalidate, tags: ["wordpress"] },
    // The origin hostname serves the same WordPress install, but WordPress
    // generates permalinks from siteurl. Sending the canonical Host keeps every
    // returned path pointing at the public domain rather than the origin.
    headers: { Accept: "application/json", Host: "www.absoluteasiatours.com" },
  });
  if (!response.ok) throw new Error(`Bridge request failed (${response.status}) for ${path}`);
  return response.json() as Promise<T>;
}

/**
 * ACF stores links as absolute URLs on the public domain. Rendering them as-is
 * would send visitors off the Next.js app on every click, so own-domain links
 * become root-relative. Third-party links are left untouched.
 */
export function toLocalHref(value?: string | null) {
  if (!value) return "#";
  const raw = value.trim();
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  try {
    const url = new URL(raw);
    if (/^(?:www\.)?absoluteasiatours\.com$/i.test(url.hostname)) {
      // Editors have entered "/./thailand/" in some menu items; collapse it.
      const path = `${url.pathname}${url.search}${url.hash}`.replace(/\/\.\//g, "/");
      return path || "/";
    }
    return raw;
  } catch {
    return raw;
  }
}

export type PostCard = {
  id: number;
  type: string;
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  featuredMedia: FeaturedMedia | null;
  duration: string;
  price: string;
  categories: Array<{ id: number; name: string; slug: string; path: string | null }>;
};

export type TermCard = {
  id: number;
  taxonomy: string;
  slug: string;
  name: string;
  description: string;
  count: number;
  path: string | null;
  acf: Record<string, unknown>;
};

export type ImageMeta = { id: number; url: string; width: number; height: number; alt: string; mime: string };
export type ImageMap = Record<string, ImageMeta>;

type RepeaterLink = { text?: string; url?: string };

export type HomeAcf = {
  slider_home?: Array<{ bg_banner?: string; title_banner?: string; content_banner?: string; link_button?: string }>;
  sec01_links?: Array<{ name_links?: string; link?: string }>;
  content_02?: string;
  images_list?: Array<{ image_sec02?: string; text_img_sec02?: string; link_sec02?: string }>;
  sec03_title?: string;
  post_03?: number[];
  categories?: number[];
  links_sec03?: Array<{ text_links_sec03?: string; url_sec03?: string }>;
  sec05_title?: string;
  post_05?: number[];
  sec11_title?: string;
  post11?: number[];
  links_sec11?: Array<{ text_links_sec11?: string; url_sec11?: string }>;
  sec04_title?: string;
  post_04?: Array<{ term_id: number; name: string; slug: string }>;
  button_text_sec04?: string;
  button_link_sec04?: string;
  slide_review?: Array<{ avatar?: string; user_name?: string; date?: string; vote?: string; content?: string }>;
  name_web_review?: string;
  logo_web_review?: string;
  link_web_review?: string;
  text_review?: string;
};

async function getPosts(ids?: number[]): Promise<PostCard[]> {
  if (!ids?.length) return [];
  try {
    return await api<PostCard[]>(`/absolute-asia/v1/posts?include=${ids.join(",")}`);
  } catch {
    return [];
  }
}

async function getTerms(ids?: number[]): Promise<TermCard[]> {
  if (!ids?.length) return [];
  try {
    return await api<TermCard[]>(`/absolute-asia/v1/terms?include=${ids.join(",")}`);
  } catch {
    return [];
  }
}

/**
 * Every ACF image field on this site returns a bare URL string, so alt text and
 * intrinsic dimensions have to be resolved separately. Collecting all URLs for
 * the page and resolving them in one request avoids a fetch per image.
 */
async function getImageMap(urls: Array<string | undefined | null>): Promise<ImageMap> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url && url.trim())))].map((u) => u.trim());
  if (!unique.length) return {};
  try {
    return await api<ImageMap>(`/absolute-asia/v1/images?urls=${encodeURIComponent(unique.join(","))}`, 3600);
  } catch {
    // Missing metadata degrades to a fill-layout image; it should not 500 the page.
    return {};
  }
}

export type HomeData = {
  content: ContentRecord;
  acf: HomeAcf;
  blogs: PostCard[];
  tours: PostCard[];
  hotels: PostCard[];
  categories: TermCard[];
  inspirations: TermCard[];
  images: ImageMap;
};

export const getHomeData = cache(async (): Promise<HomeData> => {
  const content = await api<ContentRecord>("/absolute-asia/v1/content?path=/");
  const acf = (content.acf || {}) as HomeAcf;

  const [blogs, tours, hotels, categories, inspirations] = await Promise.all([
    getPosts(acf.post_03),
    getPosts(acf.post_05),
    getPosts(acf.post11),
    getTerms(acf.categories),
    getTerms(acf.post_04?.map((term) => term.term_id)),
  ]);

  const images = await getImageMap([
    ...(acf.slider_home?.map((slide) => slide.bg_banner) ?? []),
    ...(acf.images_list?.map((item) => item.image_sec02) ?? []),
    ...(acf.slide_review?.map((review) => review.avatar) ?? []),
    ...categories.map((term) => term.acf?.banner as string | undefined),
    ...inspirations.map((term) => term.acf?.featured as string | undefined),
    acf.logo_web_review,
  ]);

  return { content, acf, blogs, tours, hotels, categories, inspirations, images };
});
