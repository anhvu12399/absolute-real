/**
 * Structured data.
 *
 * Search engines read a travel page through schema.org: a journey is a
 * `TouristTrip`, a property is a `Hotel`, a country is a `TouristDestination`.
 * Without it the pages compete as plain documents and lose the rich results —
 * breadcrumbs, ratings, prices — that a travel query returns.
 *
 * Everything here is derived from what WordPress already holds. Nothing is
 * asserted that the page does not also say in its own words, because a claim in
 * schema that the page cannot back up is what earns a manual penalty.
 */

import type { ContentRecord } from "./types";
import { BRAND_NAME, isDoomedUpload, SITE_URL, SOCIAL_LINKS } from "./site";

type Json = Record<string, unknown>;

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

/** Plain text, short enough for a description slot. */
function plain(value?: string | null, max = 300) {
  const text = String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/**
 * The organization itself, emitted once site-wide.
 *
 * `TravelAgency` rather than the generic `Organization`: it is the type that
 * matches what this business is, and it accepts the fields a traveler searches
 * on — phone, area served, social profiles.
 */
export function organizationSchema(opts: { logo?: string; phone?: string; description?: string }): Json {
  const schema: Json = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    url: SITE_URL,
  };
  if (opts.description) schema.description = plain(opts.description);

  /* Google reads `logo` to decide what to show beside the result. It has to be
     a URL that keeps resolving, which rules out anything on the public domain
     itself while that domain is being moved from WordPress to this site: the
     new frontend serves no /wp-content/. WordPress uploads live on the backend
     host and are unaffected; if the stored logo still points at the public
     domain, the site's own icon is the honest fallback. */
  const logo = opts.logo && !isDoomedUpload(opts.logo) ? abs(opts.logo) : `${SITE_URL}/icon.svg`;
  schema.logo = { "@type": "ImageObject", url: logo };
  /* Same image again as `image`: some consumers read only one of the two. */
  schema.image = logo;

  if (opts.phone) schema.telephone = opts.phone;
  if (SOCIAL_LINKS.length) schema.sameAs = SOCIAL_LINKS.map((s) => s.url);
  return schema;
}


/**
 * The site as a thing in its own right.
 *
 * This is what Google reads to print "Absolute Asia Tours" above the result
 * instead of the bare domain. `name` has to agree with the `og:site_name` and
 * the homepage title, or Google picks whichever it trusts most and the three
 * disagree in public.
 */
export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND_NAME,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/**
 * Breadcrumbs built from the URL itself.
 *
 * Google shows these in place of the raw URL, which is worth more on a deep
 * path like /collection/amanfayun-hangzhou/ than the domain repeated.
 */
export function breadcrumbSchema(path: string, title: string): Json | null {
  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return null;

  const label = (segment: string) =>
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const items = segments.map((segment, index) => ({
    "@type": "ListItem",
    position: index + 2,
    name: index === segments.length - 1 ? title : label(segment),
    item: abs(`/${segments.slice(0, index + 1).join("/")}/`),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...items,
    ],
  };
}

/** The schema type that matches a WordPress post type. */
export function contentSchema(content: ContentRecord, path: string): Json | null {
  const acf = (content.acf || {}) as Record<string, unknown>;
  const str = (key: string) => (typeof acf[key] === "string" ? (acf[key] as string).trim() : "");
  const image = content.featuredMedia?.url || str("hero_image");
  const country = content.terms?.find((t) => t.taxonomy === "country")?.name;

  const base: Json = {
    "@context": "https://schema.org",
    name: content.title,
    url: abs(path),
    ...(plain(content.excerpt) ? { description: plain(content.excerpt) } : {}),
    ...(image ? { image: abs(image) } : {}),
  };

  switch (content.type) {
    case "tour": {
      const days = Number(acf.duration_days) || 0;
      return {
        ...base,
        "@type": "TouristTrip",
        provider: { "@id": `${SITE_URL}/#organization` },
        ...(country ? { touristType: "Private traveler", itinerary: { "@type": "ItemList", name: `${content.title} itinerary` } } : {}),
        /* Only when WordPress actually holds a duration - an invented one is
           worse than none. ISO 8601, which is what the spec wants. */
        ...(days > 0 ? { subjectOf: { "@type": "Trip", name: content.title }, duration: `P${days}D` } : {}),
      };
    }

    case "hotel":
      return {
        ...base,
        "@type": "Hotel",
        ...(str("hotel_location") || country
          ? { address: { "@type": "PostalAddress", addressLocality: str("hotel_location") || country } }
          : {}),
        ...(str("latitude") && str("longitude")
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: Number(str("latitude")),
                longitude: Number(str("longitude")),
              },
            }
          : {}),
      };

    case "place_to_go":
      return {
        ...base,
        "@type": "TouristDestination",
        ...(country ? { containedInPlace: { "@type": "Country", name: country } } : {}),
      };

    case "thing_to_do":
      return { ...base, "@type": "TouristAttraction" };

    case "travel_guide":
    case "blog":
    case "post":
      return {
        ...base,
        "@type": "Article",
        headline: content.title,
        ...(content.date ? { datePublished: content.date } : {}),
        ...(content.modified ? { dateModified: content.modified } : {}),
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntityOfPage: { "@type": "WebPage", "@id": abs(path) },
      };

    default:
      return null;
  }
}

/**
 * A country landing page.
 *
 * These are assembled by the router from a `page` record, so `contentSchema`
 * cannot type them from the post type alone - and they are the pages that
 * compete for "Vietnam luxury tours", which makes them the ones that most need
 * describing. The journeys listed on the page become the destination's
 * `ItemList`, which is what search results show underneath a destination.
 */
export function destinationSchema(opts: {
  name: string;
  path: string;
  description?: string;
  image?: string;
  tours?: Array<{ title: string; path: string }>;
}): Json {
  const schema: Json = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: opts.name,
    url: abs(opts.path),
    ...(plain(opts.description) ? { description: plain(opts.description) } : {}),
    ...(opts.image ? { image: abs(opts.image) } : {}),
    ...(opts.name ? { containedInPlace: { "@type": "Continent", name: "Asia" } } : {}),
  };

  if (opts.tours?.length) {
    schema.hasPart = opts.tours.slice(0, 10).map((tour) => ({
      "@type": "TouristTrip",
      name: tour.title,
      url: abs(tour.path),
      provider: { "@id": `${SITE_URL}/#organization` },
    }));
  }
  return schema;
}

/**
 * A directory page - the hotel collection, the destinations index.
 *
 * `CollectionPage` with an `ItemList` is what tells a search engine this URL is
 * the index for a set rather than a thin page repeating its members' titles.
 */
export function collectionSchema(opts: {
  name: string;
  path: string;
  description?: string;
  items?: Array<{ title: string; path: string }>;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    url: abs(opts.path),
    ...(plain(opts.description) ? { description: plain(opts.description) } : {}),
    ...(opts.items?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: opts.items.length,
            itemListElement: opts.items.slice(0, 20).map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.title,
              url: abs(item.path),
            })),
          },
        }
      : {}),
  };
}

/**
 * Reviews the homepage already publishes, as an aggregate rating.
 *
 * Emitted only when the reviews carry a score. Google requires the rating to be
 * visible on the same page, which it is — the review cards show the stars.
 */
export function reviewSchema(testimonials: Array<{ user_name?: string; content?: string; vote?: string | number; date?: string }>): Json | null {
  const scored = testimonials.filter((t) => Number(t.vote) > 0);
  if (scored.length < 2) return null;

  const average = scored.reduce((sum, t) => sum + Number(t.vote), 0) / scored.length;

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Math.round(average * 10) / 10,
      reviewCount: scored.length,
      bestRating: 5,
    },
    review: scored.slice(0, 5).map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.user_name || "Traveler" },
      reviewRating: { "@type": "Rating", ratingValue: Number(t.vote), bestRating: 5 },
      ...(t.content ? { reviewBody: plain(t.content, 400) } : {}),
      ...(t.date ? { datePublished: t.date } : {}),
    })),
  };
}

/** Renders a set of schemas as one script tag's worth of JSON. */
export function schemaScript(...schemas: Array<Json | null | undefined>) {
  const graph = schemas.filter(Boolean);
  if (!graph.length) return null;
  return JSON.stringify(graph.length === 1 ? graph[0] : graph);
}
