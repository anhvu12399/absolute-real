import { cache } from "react";
import type { ContentRecord, FeaturedMedia } from "./types";

const API = (process.env.WORDPRESS_API_URL || "https://origin.absoluteasiatours.com/wp-json").replace(/\/$/, "");

async function api<T>(path: string, revalidate = 300): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    next: { revalidate, tags: ["wordpress"] },
    headers: { Accept: "application/json", Host: "www.absoluteasiatours.com" },
  });
  if (!response.ok) throw new Error(`Bridge request failed (${response.status}) for ${path}`);
  return response.json() as Promise<T>;
}

export function toLocalHref(value?: string | null) {
  if (!value) return "#";
  const raw = value.trim();
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  try {
    const url = new URL(raw);
    if (/^(?:www\.)?absoluteasiatours\.com$/i.test(url.hostname)) {
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

const DEFAULT_TOURS: PostCard[] = [
  {
    id: 1001,
    type: "tour",
    slug: "vietnam-highlights-luxury-tour",
    path: "/vietnam-highlights-luxury-tour/",
    title: "Vietnam Highlights & Halong Bay Cruise",
    excerpt: "Discover Hanoi, Halong Bay luxury cruise, Hoi An ancient town & Mekong Delta.",
    featuredMedia: {
      url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-1024x455.jpg",
      width: 1024,
      height: 455,
      alt: "Vietnam Highlights",
    },
    duration: "10 Days / 9 Nights",
    price: "From $2,850",
    categories: [{ id: 1, name: "Vietnam Tours", slug: "vietnam", path: "/vietnam-tours/" }],
  },
  {
    id: 1002,
    type: "tour",
    slug: "japan-cultural-heritage-luxury",
    path: "/japan-cultural-heritage-luxury/",
    title: "Timeless Japan & Cultural Wonders",
    excerpt: "Immerse in Tokyo, Kyoto temples, Hakone Mount Fuji & luxury ryokans.",
    featuredMedia: {
      url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun1-1024x636.jpg",
      width: 1024,
      height: 636,
      alt: "Timeless Japan",
    },
    duration: "12 Days / 11 Nights",
    price: "From $4,200",
    categories: [{ id: 2, name: "Japan Tours", slug: "japan", path: "/japan-tours/" }],
  },
  {
    id: 1003,
    type: "tour",
    slug: "thailand-tropical-island-escape",
    path: "/thailand-tropical-island-escape/",
    title: "Thailand Island Escape & Chiang Mai",
    excerpt: "Bangkok temples, Elephant Nature Park & private villa in Phuket.",
    featuredMedia: {
      url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun6.jpg",
      width: 800,
      height: 500,
      alt: "Thailand Escape",
    },
    duration: "9 Days / 8 Nights",
    price: "From $2,450",
    categories: [{ id: 3, name: "Thailand Tours", slug: "thailand", path: "/thailand-tours/" }],
  },
  {
    id: 1004,
    type: "tour",
    slug: "bali-luxury-wellness-retreat",
    path: "/bali-luxury-wellness-retreat/",
    title: "Bali Luxury Wellness & Beach Sanctuary",
    excerpt: "Ubud rice terraces, spa sanctuaries & Uluwatu cliffside luxury.",
    featuredMedia: {
      url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-990x440.jpg",
      width: 990,
      height: 440,
      alt: "Bali Luxury",
    },
    duration: "7 Days / 6 Nights",
    price: "From $2,100",
    categories: [{ id: 4, name: "Bali Tours", slug: "bali", path: "/bali-tours/" }],
  },
];

const DEFAULT_HOTELS: PostCard[] = [
  {
    id: 2001,
    type: "hotel",
    slug: "sofitel-legend-peoples-grand-hotel-xian",
    path: "/hotels/sofitel-legend-peoples-grand-hotel-xian/",
    title: "Sofitel Legend Peoples Grand Hotel Xian",
    excerpt: "Historic luxury hotel in the heart of Xian.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun6.jpg", width: 800, height: 500, alt: "Sofitel Legend Xian" },
    duration: "Xian, China",
    price: "5 Star Luxury",
    categories: [{ id: 5, name: "China", slug: "china", path: "/china-tours/" }],
  },
  {
    id: 2002,
    type: "hotel",
    slug: "alila-villas-uluwatu",
    path: "/hotels/alila-villas-uluwatu/",
    title: "Alila Villas Uluwatu",
    excerpt: "Eco-friendly luxury cliffside resort in Bali.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-1024x455.jpg", width: 1024, height: 455, alt: "Alila Villas Uluwatu" },
    duration: "Bali, Indonesia",
    price: "5 Star Luxury",
    categories: [{ id: 4, name: "Bali", slug: "bali", path: "/bali-tours/" }],
  },
  {
    id: 2003,
    type: "hotel",
    slug: "ani-thailand",
    path: "/hotels/ani-thailand/",
    title: "Ani Thailand",
    excerpt: "Private beachfront resort on Koh Yao Noi.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun1-1024x636.jpg", width: 1024, height: 636, alt: "Ani Thailand" },
    duration: "Koh Yao Noi, Thailand",
    price: "5 Star Ultra-Luxury",
    categories: [{ id: 3, name: "Thailand", slug: "thailand", path: "/thailand-tours/" }],
  },
  {
    id: 2004,
    type: "hotel",
    slug: "anhill-boutique",
    path: "/hotels/anhill-boutique/",
    title: "aNhill Boutique",
    excerpt: "Peaceful boutique retreat nestled in Hue countryside.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-990x440.jpg", width: 990, height: 440, alt: "aNhill Boutique" },
    duration: "Hue, Vietnam",
    price: "5 Star Luxury",
    categories: [{ id: 1, name: "Vietnam", slug: "vietnam", path: "/vietnam-tours/" }],
  },
  {
    id: 2005,
    type: "hotel",
    slug: "anantara-mui-ne-resort-and-spa",
    path: "/hotels/anantara-mui-ne-resort-and-spa/",
    title: "Anantara Mui Ne Resort and Spa",
    excerpt: "Tropical beachfront sanctuary amidst coconut palms.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-1024x455.jpg", width: 1024, height: 455, alt: "Anantara Mui Ne" },
    duration: "Mui Ne, Vietnam",
    price: "5 Star Luxury",
    categories: [{ id: 1, name: "Vietnam", slug: "vietnam", path: "/vietnam-tours/" }],
  },
  {
    id: 2006,
    type: "hotel",
    slug: "an-lam-retreats-ninh-van-bay",
    path: "/hotels/an-lam-retreats-ninh-van-bay/",
    title: "An Lâm Retreats Ninh Van Bay",
    excerpt: "Private eco-luxury villas accessible only by boat.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun1-1024x636.jpg", width: 1024, height: 636, alt: "An Lam Retreats" },
    duration: "Nha Trang, Vietnam",
    price: "5 Star Luxury",
    categories: [{ id: 1, name: "Vietnam", slug: "vietnam", path: "/vietnam-tours/" }],
  },
  {
    id: 2007,
    type: "hotel",
    slug: "capella-hanoi",
    path: "/hotels/capella-hanoi/",
    title: "Capella Hanoi",
    excerpt: "Art Deco luxury opera hotel near Hanoi Old Quarter.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun6.jpg", width: 800, height: 500, alt: "Capella Hanoi" },
    duration: "Hanoi, Vietnam",
    price: "5 Star Luxury",
    categories: [{ id: 1, name: "Vietnam", slug: "vietnam", path: "/vietnam-tours/" }],
  },
  {
    id: 2008,
    type: "hotel",
    slug: "four-seasons-chiang-mai",
    path: "/hotels/four-seasons-chiang-mai/",
    title: "Four Seasons Resort Chiang Mai",
    excerpt: "Luxury sanctuary amidst lush rice paddies in Northern Thailand.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-1024x455.jpg", width: 1024, height: 455, alt: "Four Seasons Chiang Mai" },
    duration: "Chiang Mai, Thailand",
    price: "5 Star Luxury",
    categories: [{ id: 3, name: "Thailand", slug: "thailand", path: "/thailand-tours/" }],
  },
  {
    id: 2009,
    type: "hotel",
    slug: "amanpuri-phuket",
    path: "/hotels/amanpuri-phuket/",
    title: "Amanpuri Phuket",
    excerpt: "Exclusive beachside pavilion sanctuary overlooking Andaman Sea.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun1-1024x636.jpg", width: 1024, height: 636, alt: "Amanpuri Phuket" },
    duration: "Phuket, Thailand",
    price: "5 Star Ultra-Luxury",
    categories: [{ id: 3, name: "Thailand", slug: "thailand", path: "/thailand-tours/" }],
  },
  {
    id: 2010,
    type: "hotel",
    slug: "park-hyatt-kyoto",
    path: "/hotels/park-hyatt-kyoto/",
    title: "Park Hyatt Kyoto",
    excerpt: "Luxury guesthouse in Higashiyama with views of Yasaka Pagoda.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-990x440.jpg", width: 990, height: 440, alt: "Park Hyatt Kyoto" },
    duration: "Kyoto, Japan",
    price: "5 Star Luxury",
    categories: [{ id: 2, name: "Japan", slug: "japan", path: "/japan-tours/" }],
  },
  {
    id: 2011,
    type: "hotel",
    slug: "amanoi",
    path: "/hotels/amanoi/",
    title: "Amanoi",
    excerpt: "Secluded cliffside resort overlooking Vinh Hy Bay.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/05/Aman_Amanfayun6.jpg", width: 800, height: 500, alt: "Amanoi" },
    duration: "Ninh Thuan, Vietnam",
    price: "5 Star Ultra-Luxury",
    categories: [{ id: 1, name: "Vietnam", slug: "vietnam", path: "/vietnam-tours/" }],
  },
  {
    id: 2012,
    type: "hotel",
    slug: "banyan-tree-lang-co",
    path: "/hotels/banyan-tree-lang-co/",
    title: "Banyan Tree Lang Co",
    excerpt: "All-pool villa resort nestled between East Sea and Truong Son Mountains.",
    featuredMedia: { url: "https://www.absoluteasiatours.com/wp-content/uploads/2026/08/Golden-Ha-Long-Bay-Yacht-Panorama-1024x455.jpg", width: 1024, height: 455, alt: "Banyan Tree Lang Co" },
    duration: "Lang Co, Vietnam",
    price: "5 Star Luxury",
    categories: [{ id: 1, name: "Vietnam", slug: "vietnam", path: "/vietnam-tours/" }],
  },
];

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

async function getImageMap(urls: Array<string | undefined | null>): Promise<ImageMap> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url && url.trim())))].map((u) => u.trim());
  if (!unique.length) return {};
  try {
    return await api<ImageMap>(`/absolute-asia/v1/images?urls=${encodeURIComponent(unique.join(","))}`, 3600);
  } catch {
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
  let content: ContentRecord = {
    id: 0,
    type: "page",
    slug: "home",
    path: "/",
    title: "Home",
    content: "",
    excerpt: "",
    status: "publish",
    date: new Date().toISOString(),
    modified: new Date().toISOString(),
    acf: {},
  };
  try {
    content = await api<ContentRecord>("/absolute-asia/v1/content?path=/");
  } catch {
    content = {
      id: 0,
      type: "page",
      slug: "home",
      path: "/",
      title: "Home",
      content: "",
      excerpt: "",
      status: "publish",
      date: new Date().toISOString(),
      modified: new Date().toISOString(),
      acf: {},
    };
  }

  const acf = (content.acf || {}) as HomeAcf;

  const [blogsRes, toursRes, hotelsRes, categoriesRes, inspirationsRes] = await Promise.all([
    getPosts(acf.post_03),
    getPosts(acf.post_05),
    getPosts(acf.post11),
    getTerms(acf.categories),
    getTerms(acf.post_04?.map((term) => term.term_id)),
  ]);

  const tours = toursRes.length > 0 ? toursRes : DEFAULT_TOURS;
  const hotels = hotelsRes.length > 0 ? hotelsRes : DEFAULT_HOTELS;
  const blogs = blogsRes;
  const categories = categoriesRes;
  const inspirations = inspirationsRes;

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
