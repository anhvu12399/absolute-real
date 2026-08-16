import type { MetadataRoute } from "next";
import { getAllPathsSafe } from "@/lib/wp";
import { SITE_URL } from "@/lib/site";

const BASE = SITE_URL;

const PRIORITY: Record<string, number> = {
  tour: 0.9,
  trip: 0.75,
  place_to_go: 0.8,
  hotel: 0.7,
  travel_guide: 0.6,
  thing_to_do: 0.6,
  blog: 0.6,
  post: 0.6,
  page: 0.6,
};

export const revalidate = 3600;

/* WordPress ships with a sample post and a sample page; the import carried
   them across and the sitemap invited Google to index them. */
const SAMPLE_CONTENT = /^\/(hello-world|sample-page)\/?$/i;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getAllPathsSafe();
  const entries = paths
    .filter((item) => !SAMPLE_CONTENT.test(item.path))
    .map((item) => ({
    url: `${BASE}${item.path}`,
    lastModified: item.modified ? new Date(item.modified) : new Date(),
    changeFrequency: "weekly" as const,
    priority: PRIORITY[item.type] ?? 0.5,
  }));
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
