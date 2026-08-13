import type { MetadataRoute } from "next";
import { getArchiveSafe } from "@/lib/wp";
import { SITE_URL } from "@/lib/site";

const BASE = SITE_URL;

/** Types worth indexing, with the priority each gets in the sitemap. */
const INDEXED = [
  { type: "tour", priority: 0.9 },
  { type: "place_to_go", priority: 0.8 },
  { type: "hotel", priority: 0.7 },
  { type: "travel_guide,thing_to_do,blog", priority: 0.6 },
  { type: "page", priority: 0.6 },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const batches = await Promise.all(
    INDEXED.map(async ({ type, priority }) => {
      const items = await getArchiveSafe({ type, perPage: 100 });
      return items.map((item) => ({
        url: `${BASE}${item.path}`,
        lastModified: item.date ? new Date(item.date) : new Date(),
        changeFrequency: "weekly" as const,
        priority,
      }));
    }),
  );

  const entries = batches.flat();
  const seen = new Set<string>();
  const unique = entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });

  return [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...unique,
  ];
}
