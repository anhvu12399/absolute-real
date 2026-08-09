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
  acf?: Record<string, unknown>;
  seo?: SeoData;
};

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
