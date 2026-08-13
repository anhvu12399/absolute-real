export type SeoData = {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: { index?: boolean; follow?: boolean };
  openGraph?: Record<string, string>;
  schema?: unknown;
};

export type FeaturedMedia = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type TermRef = {
  id: number;
  taxonomy: string;
  name: string;
  slug: string;
  path: string | null;
};

/** Compact shape the bridge uses for cards and resolved relationships. */
export type CardRecord = {
  id: number;
  type: string;
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  featuredMedia: FeaturedMedia | null;
  duration: string;
  price: string;
  categories: TermRef[];
};

/** Relationship fields the bridge resolves into cards so pages need no extra fetch. */
export type RelatedRecords = Partial<
  Record<
    | "featured_stays"
    | "featured_tours"
    | "related_tours"
    | "related_places"
    | "related_guides"
    | "related_hotels"
    | "related_things"
    | "city",
    CardRecord[]
  >
>;

export type ContentRecord = {
  id: number;
  type: string;
  slug: string;
  path: string;
  status: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  modified: string;
  template?: string;
  featuredMedia?: FeaturedMedia;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  terms?: TermRef[];
  related?: RelatedRecords;
  acf?: Record<string, unknown>;
  seo?: SeoData;
};

/** One row of the `itinerary` repeater. */
export type ItineraryRow = {
  day_num?: string;
  group_tag?: string;
  title?: string;
  description?: string;
  image_url?: string;
  latitude?: string;
  longitude?: string;
};

export type GalleryRow = { image_url?: string; caption?: string };
export type FaqRow = { question?: string; answer?: string };
export type DepartureRow = { date_range?: string; price_info?: string; availability_status?: string };

export type ItineraryDay = {
  day?: string;
  title?: string;
  content?: string;
  image?: string;
};

export type TourPriceRow = {
  duration?: string;
  price?: string;
  pax?: string;
};

export type TourAcf = {
  gallery?: string[];
  duration?: string;
  code?: string;
  start_location?: string;
  end_location?: string;
  highlights?: string;
  itinerary?: ItineraryDay[];
  tour_price?: TourPriceRow[];
  inclusions?: string;
  exclusions?: string;
  map_url?: string;
  related_tours?: number[];
};
