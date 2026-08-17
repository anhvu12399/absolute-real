import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomeTemplateV2 from "@/components/home/HomeTemplateV2";
import DestinationTemplateV2 from "@/components/destination/DestinationTemplateV2";
import AllDestinationsTemplateV2 from "@/components/destination/AllDestinationsTemplateV2";
import HotelDirectoryTemplateV2 from "@/components/hotel/HotelDirectoryTemplateV2";
import SingleHotelTemplateV2 from "@/components/hotel/SingleHotelTemplateV2";
import JourneysDirectoryTemplateV2 from "@/components/journey/JourneysDirectoryTemplateV2";
import CruisesDirectoryTemplateV2 from "@/components/cruise/CruisesDirectoryTemplateV2";
import InspirationDirectoryTemplateV2 from "@/components/inspiration/InspirationDirectoryTemplateV2";
import WhyUsTemplateV2 from "@/components/about/WhyUsTemplateV2";
import PlanTripTemplateV2 from "@/components/plan/PlanTripTemplateV2";
import TourListingTemplateV2 from "@/components/tour/TourListingTemplateV2";
import SingleTourTemplateV2 from "@/components/tour/SingleTourTemplateV2";
import SingleArticleTemplateV2 from "@/components/article/SingleArticleTemplateV2";
import StandardPageTemplateV2 from "@/components/page/StandardPageTemplateV2";
import TaxonomyArchiveTemplate from "@/components/archive/TaxonomyArchiveTemplate";
import type { ArchiveItem } from "@/lib/wp";
import { decodeEntities, getAllPathsSafe, getArchiveSafe, getContentByPath, getSeo, getTermBySlug, getTermsSafe, getSiteDataSafe, illustratedFirst, realCountries, searchContent } from "@/lib/wp";
import { BRAND_NAME } from "@/lib/site";
import { EditBar } from "@/components/v2/EditBar";
import { editPostUrl, editTargets, editTermUrl } from "@/lib/admin";
import { breadcrumbSchema, collectionSchema, contentSchema, destinationSchema, reviewSchema, schemaScript } from "@/lib/schema";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";

export const revalidate = 300;

/** Pre-render every public WordPress record; unknown future paths still use ISR. */
export async function generateStaticParams(): Promise<Array<{ slug: string[] }>> {
  const paths = await getAllPathsSafe();
  return [
    { slug: [] },
    ...paths
      .filter((item) => item.path && item.path !== "/")
      .map((item) => ({ slug: item.path.split("/").filter(Boolean) })),
  ];
}

/* ── Metadata ── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  /* Trailing slash, the same shape the renderer uses for cleanPath. Without
     it the route lookups here missed every directory — "/tours" is not
     "/tours/" — so those pages never picked up their own title. */
  const path = !slug || slug.length === 0 ? "/" : `/${slug.join("/")}/`;

  if (path === "/") {
    const homeImage = "https://backend.absoluteasiatours.com/wp-content/uploads/2025/07/pexels-dejongwout-750895.jpg";
    return {
      title: { absolute: SITE_TITLE },
      description: SITE_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: {
        siteName: BRAND_NAME,
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        url: "/",
        type: "website",
        images: [{ url: homeImage, width: 1200, height: 630, alt: `${BRAND_NAME} - Private Luxury Asia Journeys` }],
      },
      twitter: {
        card: "summary_large_image",
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: [homeImage],
      },
    };
  }

  /* Try WP content API for metadata */
  const content = await getContentByPath(path);
  if (!content) return routeMetadata(path);

  const seo = await getSeo(path, content.seo);
  const ownTitle = decodeEntities(seo?.title || content.title);
  const ownDescription = decodeEntities(seo?.description || content.excerpt);

  const route = ROUTE_META[path] || hubMeta(path);
  const saysNothing = !ownTitle || ownTitle.trim().toLowerCase() === BRAND_NAME.toLowerCase();
  if (route && saysNothing) return routeMetadata(path);

  const title = ownTitle;
  const description = clampDescription(ownDescription);
  const canonical = publicCanonical(seo?.canonical, path);
  const acf = (content.acf || {}) as Record<string, unknown>;
  const rawImg = content.featuredMedia?.url || (typeof acf.hero_image === "string" ? (acf.hero_image as string) : null);
  const ogImages = rawImg ? [{ url: rawImg, width: 1200, height: 630, alt: title }] : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: seo?.robots?.index !== false, follow: seo?.robots?.follow !== false },
    openGraph: {
      siteName: BRAND_NAME,
      title,
      description,
      url: canonical,
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: rawImg ? [rawImg] : undefined,
    },
  };
}

/**
 * A canonical URL that points at this site.
 *
 * RankMath stores the canonical against the WordPress install, so every page
 * was telling search engines that the real version lived on
 * backend.absoluteasiatours.com — the admin host, which is not meant to be
 * indexed at all. Only a canonical already on the public site is trusted; any
 * other host keeps just its path.
 */
function publicCanonical(canonical: string | undefined, path: string) {
  if (!canonical) return path;
  try {
    const url = new URL(canonical);
    const site = new URL(SITE_URL);
    return url.host === site.host ? url.pathname : url.pathname || path;
  } catch {
    return canonical.startsWith("/") ? canonical : path;
  }
}

/** Search engines cut the snippet around 160 characters; WordPress excerpts run far past it. */
function clampDescription(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const clipped = text.slice(0, 160);
  const stop = clipped.lastIndexOf(" ");
  return `${(stop > 100 ? clipped.slice(0, stop) : clipped).replace(/[,;:.\s]+$/, "")}…`;
}

/** Titles and descriptions for the pages assembled from queries. */
const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/tours/": { title: "Private Asia Journeys", description: "Tailor-made private journeys across Asia, designed around your pace and interests." },
  "/journeys/": { title: "Private Asia Journeys", description: "Tailor-made private journeys across Asia, designed around your pace and interests." },
  "/destinations/": { title: "Asia Destinations", description: "Every country we travel, with the journeys, stays and guides that belong to each." },
  "/where-to-stay/": { title: "Where to Stay in Asia", description: "Hotels and private villas chosen for character rather than chain, across Asia." },
  "/hotels/": { title: "Where to Stay in Asia", description: "Hotels and private villas chosen for character rather than chain, across Asia." },
  "/collection/": { title: "The Hotel Collection", description: "Hotels and private villas chosen for character rather than chain, across Asia." },
  "/inspirations/": { title: "Travel Inspiration", description: "Guides, itineraries and stories to read before you travel across Asia." },
  "/travel-ideas/": { title: "Travel Inspiration", description: "Guides, itineraries and stories to read before you travel across Asia." },
  "/plan-my-trip/": { title: "Plan Your Journey", description: "Tell us where you want to go and a private travel designer will shape the itinerary around you." },
  "/tailor-made-tours/": { title: "Tailor-Made Tours", description: "Tell us where you want to go and a private travel designer will shape the itinerary around you." },
};

/**
 * Hub routes are matched by prefix, not by exact path.
 *
 * /journeys/private-tours/ and /cruises/halong-bay/ are rendered by the same
 * directory templates as their parents, but they are not in ROUTE_META, so
 * they fell through to the brand-only title.
 */
function hubMeta(path: string) {
  const segment = path.split("/").filter(Boolean)[1];
  const label = segment
    ? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  if (path.startsWith("/journeys/")) {
    return {
      title: label ? `${label} Journeys` : "Private Asia Journeys",
      description: `Private, tailor-made journeys across Asia${label ? ` — ${label.toLowerCase()}` : ""}, arranged around how you want to travel.`,
    };
  }
  if (path.startsWith("/cruises/")) {
    return {
      title: label ? `${label} Cruises` : "Asia Cruises",
      description: `Boutique ships and private junks${label ? ` on ${label}` : " across Asia"}, chartered around your own itinerary.`,
    };
  }
  if (path.startsWith("/inspiration/")) {
    return { title: label || "Travel Inspiration", description: ROUTE_META["/inspirations/"].description };
  }
  return null;
}

async function routeMetadata(path: string): Promise<Metadata> {
  const defaultHubImage = "https://backend.absoluteasiatours.com/wp-content/uploads/2025/07/pexels-dejongwout-750895.jpg";
  const known = ROUTE_META[path] || hubMeta(path);
  if (known) {
    return {
      title: known.title,
      description: known.description,
      alternates: { canonical: path },
      openGraph: {
        siteName: BRAND_NAME,
        title: known.title,
        description: known.description,
        url: path,
        type: "website",
        images: [{ url: defaultHubImage, width: 1200, height: 630, alt: known.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: known.title,
        description: known.description,
        images: [defaultHubImage],
      },
    };
  }

  /* A country page: /vietnam/ is a taxonomy term, not a post. */
  const slug = path.replace(/^\/|\/$/g, "");
  if (slug && !slug.includes("/")) {
    const term = await getTermBySlug(slug, "country");
    if (term) {
      const title = `${term.name} Tours & Private Journeys`;
      const description = clampDescription(
        decodeEntities(term.intro || term.description || "") ||
          `Private, tailor-made journeys through ${term.name}, arranged around how you want to travel.`
      );
      const img = term.image || defaultHubImage;
      return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
          siteName: BRAND_NAME,
          title,
          description,
          url: path,
          type: "website",
          images: [{ url: img, width: 1200, height: 630, alt: title }],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [img],
        },
      };
    }
  }

  return {
    title: BRAND_NAME,
    alternates: { canonical: path },
    openGraph: {
      siteName: BRAND_NAME,
      title: BRAND_NAME,
      url: path,
      type: "website",
      images: [{ url: defaultHubImage, width: 1200, height: 630, alt: BRAND_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND_NAME,
      images: [defaultHubImage],
    },
  };
}

/** Repeaters arrive as JSON strings when ACF free is in play. */
function parseRepeater(value: unknown): Array<Record<string, string>> {
  if (Array.isArray(value)) return value as Array<Record<string, string>>;
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

/** Single views dispatch on the WordPress post type. */
async function renderSingle(content: NonNullable<Awaited<ReturnType<typeof getContentByPath>>>) {
  switch (content.type) {
    case "tour": return renderTour(content);
    case "place_to_go": return renderPlace(content);
    case "hotel": return renderHotel(content);
    case "travel_guide":
    case "thing_to_do":
    case "blog":
    case "trip":
    case "post": return renderArticle(content);
    case "page": return renderPage(content);
    default: return null;
  }
}

/** The country a record belongs to, used to fill sections by query. */
function countryOf(content: { terms?: { taxonomy: string; slug: string }[] }) {
  return content.terms?.find((t) => t.taxonomy === "country")?.slug;
}

/**
 * A journey page. Imported tours carry no hand-picked hotel list, so the
 * "where you stay" strip fills from the country the journey covers.
 */
async function renderTour(content: NonNullable<Awaited<ReturnType<typeof getContentByPath>>>) {
  const country = countryOf(content);
  const [stays, site] = await Promise.all([
    country ? getArchiveSafe({ type: "hotel", taxonomy: "country", term: country, perPage: 6 }) : Promise.resolve([]),
    getSiteDataSafe(),
  ]);
  return <SingleTourTemplateV2 tourData={content} nearbyStays={illustratedFirst(stays)} site={site} />;
}

/**
 * A single place. The country templates already query their own content; a
 * place inside one gets the same treatment so its stays and experiences belong
 * to that place rather than to nothing.
 */
async function renderPlace(content: NonNullable<Awaited<ReturnType<typeof getContentByPath>>>) {
  const country = countryOf(content);
  const [tours, hotels, places, guides] = country
    ? await Promise.all([
        getArchiveSafe({ type: "tour", taxonomy: "country", term: country, perPage: 6 }),
        getArchiveSafe({ type: "hotel", taxonomy: "country", term: country, perPage: 8 }),
        getArchiveSafe({ type: "place_to_go", taxonomy: "country", term: country, perPage: 8 }),
        getArchiveSafe({ type: "travel_guide,blog,thing_to_do", taxonomy: "country", term: country, perPage: 6 }),
      ])
    : [[], [], [], []];

  return (
    <DestinationTemplateV2
      data={content}
      tours={illustratedFirst(tours)}
      hotels={illustratedFirst(hotels)}
      places={illustratedFirst(places).filter((p) => p.id !== content.id)}
      guides={illustratedFirst(guides)}
    />
  );
}

/**
 * A guide, thing to do or blog post. Same treatment: the "further reading" and
 * "tours you may like" strips fill from the country when nothing was picked.
 */
/**
 * Words worth searching on, taken from a title.
 *
 * Stop words and the brand's own vocabulary carry no signal: searching for
 * "the best place to visit in" matches everything and means nothing.
 */
function keywordsOf(title: string) {
  const STOP = new Set([
    "the", "a", "an", "of", "in", "to", "and", "or", "for", "with", "your", "our", "is", "are",
    "best", "top", "guide", "guides", "tour", "tours", "travel", "visit", "place", "places", "when",
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
    .slice(0, 3)
    .join(" ");
}

async function renderArticle(content: NonNullable<Awaited<ReturnType<typeof getContentByPath>>>) {
  const country = countryOf(content);

  let reading: ArchiveItem[] = [];
  let tours: ArchiveItem[] = [];

  if (country) {
    [reading, tours] = await Promise.all([
      getArchiveSafe({ type: "travel_guide,blog,thing_to_do", taxonomy: "country", term: country, perPage: 4 }),
      getArchiveSafe({ type: "tour", taxonomy: "country", term: country, perPage: 3 }),
    ]);
  } else {
    /* Imported pages carry no taxonomy at all - /halong-bay-cruises/ and the
       month guides are filed under nothing - so a country query returns an
       empty page with no way onward. Search on the title's own words instead,
       and fall back to recent journeys so the foot of the page is never bare. */
    const query = keywordsOf(content.title);
    const [found, latest] = await Promise.all([
      query ? searchContent(query) : Promise.resolve([]),
      getArchiveSafe({ type: "tour", perPage: 3 }),
    ]);

    reading = found
      .filter((item) => item.id !== content.id && item.type !== "tour")
      .slice(0, 4)
      .map(toArchiveShape);
    tours = found.filter((item) => item.type === "tour").slice(0, 3).map(toArchiveShape);
    if (!tours.length) tours = latest;
  }

  /* The month guides are a set: each one should offer the other eleven. */
  const monthSiblings = await siblingMonths(content);

  return (
    <SingleArticleTemplateV2
      data={content}
      moreReading={illustratedFirst(reading).filter((item) => item.id !== content.id)}
      countryTours={illustratedFirst(tours)}
      siblings={monthSiblings}
    />
  );
}

async function renderPage(content: NonNullable<Awaited<ReturnType<typeof getContentByPath>>>) {
  const country = countryOf(content);
  let tours: ArchiveItem[] = [];

  if (country) {
    tours = await getArchiveSafe({ type: "tour", taxonomy: "country", term: country, perPage: 4 });
  } else {
    const query = keywordsOf(content.title);
    const [found, latest] = await Promise.all([
      query ? searchContent(query) : Promise.resolve([]),
      getArchiveSafe({ type: "tour", perPage: 4 }),
    ]);
    tours = found.filter((item) => item.type === "tour").slice(0, 4).map(toArchiveShape);
    if (!tours.length) tours = latest;
  }

  return (
    <>
      <EditBar targets={editTargets({ content })} />
      <StandardPageTemplateV2
        data={content}
        relatedTours={illustratedFirst(tours)}
      />
    </>
  );
}

/** Search returns full records; the card strips want the archive shape. */
function toArchiveShape(item: Awaited<ReturnType<typeof searchContent>>[number]): ArchiveItem {
  return {
    id: item.id,
    type: item.type,
    slug: item.slug,
    path: item.path,
    title: item.title,
    excerpt: item.excerpt,
    date: item.date,
    featuredMedia: item.featuredMedia
      ? {
          url: item.featuredMedia.url,
          width: item.featuredMedia.width ?? 0,
          height: item.featuredMedia.height ?? 0,
          alt: item.featuredMedia.alt ?? item.title,
        }
      : null,
    acf: item.acf || {},
  };
}

/**
 * The other "best place to visit in {month}" pages.
 *
 * Read from WordPress rather than a list of month names in code, so a site
 * that publishes only six of them shows six.
 */
async function siblingMonths(content: { slug: string; id: number }) {
  const match = content.slug.match(/^(.*-in-)[a-z]+$/);
  if (!match || !/best-place|when-to|time-to/.test(content.slug)) return [];

  const found = await searchContent(content.slug.replace(/-/g, " ").replace(/\bin\b.*$/, "").trim());
  return found
    .filter((item) => item.id !== content.id && item.slug.startsWith(match[1]))
    .map(toArchiveShape)
    .slice(0, 6);
}

/**
 * A hotel page, with the sections the legacy template filled by query.
 *
 * `hotels_title` and `things_title` arrive with no list beside them because the
 * old PHP template ran the query at render time. Without this a property that
 * carries only photographs shows a hero and nothing else.
 */
async function renderHotel(content: NonNullable<Awaited<ReturnType<typeof getContentByPath>>>) {
  const country = content.terms?.find((t) => t.taxonomy === "country")?.slug;
  const [siblings, experiences, journeys] = country
    ? await Promise.all([
        getArchiveSafe({ type: "hotel", taxonomy: "country", term: country, perPage: 7 }),
        getArchiveSafe({ type: "thing_to_do,place_to_go", taxonomy: "country", term: country, perPage: 6 }),
        getArchiveSafe({ type: "tour", taxonomy: "country", term: country, perPage: 4 }),
      ])
    : [[], [], []];

  return (
    <SingleHotelTemplateV2
      hotelData={content}
      nearbyHotels={illustratedFirst(siblings).filter((h) => h.id !== content.id)}
      nearbyThings={illustratedFirst(experiences)}
      countryTours={illustratedFirst(journeys)}
    />
  );
}

/* ── Page Component ── */
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const rawPath = !slug || slug.length === 0 ? "/" : `/${slug.join("/")}`;
  const cleanPath = rawPath === "/" ? "/" : rawPath.endsWith("/") ? rawPath : `${rawPath}/`;

  const content = await getContentByPath(rawPath);

  /* ── Structured data ──
     Search engines read a travel page through schema.org; without it these
     pages compete as plain documents. Everything below is derived from what
     WordPress holds, so nothing is claimed that the page does not also say. */
  const jsonLd = schemaScript(
    content ? contentSchema(content, cleanPath) : null,
    content ? breadcrumbSchema(cleanPath, content.title) : null,
    cleanPath === "/" && content ? reviewSchema(parseRepeater(content.acf?.testimonials)) : null,
  );

  const Schema = () =>
    jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null;

  /* ── Homepage ──
     Cards authored in WordPress win; live archives fill any tab left empty. */
  if (cleanPath === "/") {
    const [tours, places, hotels, countryTerms, cruises, guides] = await Promise.all([
      getArchiveSafe({ type: "tour", perPage: 12 }),
      getArchiveSafe({ type: "place_to_go", perPage: 12 }),
      getArchiveSafe({ type: "hotel", perPage: 12 }),
      getTermsSafe("country"),
      /* Cruise content lives in the asia-cruises category rather than a post
         type of its own - that is how the legacy site filed it. Vessels only:
         including `blog` put an article, "Best Private Asia Luxury Tours for
         Americans", into a list of boats you can board. */
      getArchiveSafe({ type: "tour", taxonomy: "category", term: "asia-cruises", perPage: 6 }),
      getArchiveSafe({ type: "travel_guide,blog", perPage: 6 }),
    ]);
    /* Showcase strips lead with illustrated entries; a blank plate up front
       reads as broken rather than sparse. */
    return (
      <>
        <Schema />
        {/* "Ways to Explore" and "Stay With" were removed when the homepage
            was rebuilt, so this note explained two sections that no longer
            exist. The per-section rows below cover the rest. */}
        <EditBar targets={editTargets({ content })} />
        <HomeTemplateV2
          homeData={content}
          tours={illustratedFirst(tours)}
          places={illustratedFirst(places)}
          hotels={illustratedFirst(hotels)}
          countries={realCountries(countryTerms)}
          cruises={illustratedFirst(cruises)}
          guides={illustratedFirst(guides)}
        />
      </>
    );
  }

  /* ── Single views dispatch on the WordPress post type, so anything the
       importer creates lands on the right template without a path rule. ── */
  if (content) {
    const single = await renderSingle(content);
    if (single) {
      return (
        <>
          <Schema />
          <EditBar targets={editTargets({ content })} />
          {single}
        </>
      );
    }
  }

  /* ── Plan My Trip / Tailor-Made ── */
  if (cleanPath === "/plan-my-trip/" || cleanPath === "/tailor-made-tours/") {
    /* The page carries no image of its own, so the hero borrows a real journey
       photograph rather than sitting on flat ink. */
    const [tours, homeContent] = await Promise.all([
      getArchiveSafe({ type: "tour", perPage: 1 }),
      getContentByPath("/"),
    ]);
    return (
      <>
        <EditBar targets={editTargets({ content })} />
        <PlanTripTemplateV2 data={content} homeData={homeContent} fallbackImage={tours[0]?.featuredMedia?.url || ""} />
      </>
    );
  }

  /* ── Hotel Routes ── */
  if (cleanPath === "/where-to-stay/" || cleanPath === "/hotels/" || cleanPath === "/collection/" || cleanPath.includes("where-to-stay")) {
    const items = await getArchiveSafe({ type: "hotel", perPage: 60 });
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              collectionSchema({
                name: content?.title || "The Collection",
                path: cleanPath,
                description: content?.excerpt,
                items,
              }),
              breadcrumbSchema(cleanPath, content?.title || "The Collection"),
            )!,
          }}
        />
        <EditBar targets={editTargets({ content })} />
        <HotelDirectoryTemplateV2 data={content} hotels={items} />
      </>
    );
  }

  /* ── Destinations Hub & Single Countries ── */
  if (cleanPath === "/destinations/") {
    const [items, countries] = await Promise.all([
      getArchiveSafe({ type: "place_to_go", perPage: 60 }),
      getTermsSafe("country"),
      /* Cruise content lives in the asia-cruises category rather than a post
         type of its own - that is how the legacy site filed it. Vessels only:
         including `blog` put an article, "Best Private Asia Luxury Tours for
         Americans", into a list of boats you can board. */
      getArchiveSafe({ type: "tour", taxonomy: "category", term: "asia-cruises", perPage: 6 }),
      getArchiveSafe({ type: "travel_guide,blog", perPage: 6 }),
    ]);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              collectionSchema({ name: content?.title || "Asia Destinations", path: cleanPath, description: content?.excerpt, items: items }),
              breadcrumbSchema(cleanPath, content?.title || "Asia Destinations"),
            )!,
          }}
        />
        <EditBar targets={editTargets({ content })} />
        <AllDestinationsTemplateV2 data={content} items={items} countries={realCountries(countries)} />
      </>
    );
  }

  /* ── Taxonomy archives ──
     /tag/…, /city/…, /hotel_service/… are already indexed on the legacy site,
     so these URLs have to keep resolving or the rankings are lost. */
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 2) {
    const TAXONOMY_ROUTES: Record<string, string> = {
      tag: "post_tag",
      category: "category",
      country: "country",
      city: "city",
      hotel_service: "hotel_service",
      "blog-type": "blog-type",
      inspiration: "inspiration",
    };
    const taxonomy = TAXONOMY_ROUTES[segments[0]];
    if (taxonomy) {
      const term = await getTermBySlug(segments[1], taxonomy);
      if (term) {
        const items = await getArchiveSafe({
          type: "tour,place_to_go,hotel,travel_guide,thing_to_do,blog,destination",
          taxonomy,
          term: term.slug,
          perPage: 40,
        });
        return (
          <>
            <EditBar
              targets={editTargets({
                extra: [{
                  label: `Sửa taxonomy "${term.name}"`,
                  url: editTermUrl(term.id, taxonomy),
                  hint: "Sửa ảnh và mô tả cho phân loại này.",
                }],
              })}
            />
            <TaxonomyArchiveTemplate term={term} items={items} />
          </>
        );
      }
    }
  }

  /* ── Country landing pages ──
     Resolved against the `country` taxonomy instead of a hardcoded path list,
     so every country shows its own tours, hotels, places and guides. */
  const countrySlug = cleanPath.split("/").filter(Boolean)[0] || "";
  const countryTerm = countrySlug ? await getTermBySlug(countrySlug.replace(/-tours$/, ""), "country") : null;
  if (countryTerm) {
    /* The legacy site kept each country's copy and hero photograph on a page of
       its own, but never under a single naming rule: China and Japan use
       -tours, Thailand and Vietnam also have -vacations, and the remaining
       fifteen only have -travel-guides. /china/ itself is empty, so without
       this lookup the page had no image and nothing to say. In the order the
       legacy site treats them as the country's main page. */
    let countryPage = content;
    if (!countryPage) {
      for (const suffix of ["-tours", "-vacations", "-luxury-tours", "-travel-guides"]) {
        countryPage = await getContentByPath(`/${countryTerm.slug}${suffix}/`);
        if (countryPage) break;
      }
    }

    const [tours, hotels, places, guides] = await Promise.all([
      getArchiveSafe({ type: "tour", taxonomy: "country", term: countryTerm.slug, perPage: 6 }),
      getArchiveSafe({ type: "hotel", taxonomy: "country", term: countryTerm.slug, perPage: 12 }),
      getArchiveSafe({ type: "place_to_go", taxonomy: "country", term: countryTerm.slug, perPage: 12 }),
      getArchiveSafe({ type: "travel_guide,blog,thing_to_do", taxonomy: "country", term: countryTerm.slug, perPage: 6 }),
    ]);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              destinationSchema({
                name: countryTerm.name,
                path: cleanPath,
                description: countryPage?.excerpt || countryTerm.description,
                image: countryTerm.image || countryPage?.featuredMedia?.url,
                tours,
              }),
              breadcrumbSchema(cleanPath, countryTerm.name),
            )!,
          }}
        />
      <EditBar
        targets={editTargets({
          content: countryPage
            ? { ...countryPage, title: `${countryTerm.name} (${countryPage.slug})` }
            : null,
          extra: [
            {
              label: `Ảnh & câu mở đầu cho ${countryTerm.name}`,
              url: editTermUrl(countryTerm.id, "country"),
              hint: "Đặt ở đây thì đè lên bài bên trên — khỏi phải tìm bài nào.",
            },
          ],
        })}
      />
      <DestinationTemplateV2
        data={
          countryPage
            ? {
                ...countryPage,
                title: countryTerm.name,
                /* Anything set on the country term overrides the page it
                   borrowed, so an editor can fix a country without hunting for
                   which legacy page it came from. */
                featuredMedia: countryTerm.image
                  ? { url: countryTerm.image, width: 0, height: 0, alt: countryTerm.name }
                  : countryPage.featuredMedia,
                acf: {
                  ...(countryPage.acf || {}),
                  ...(countryTerm.intro ? { destination_overview: countryTerm.intro } : {}),
                },
              }
            : {
                title: countryTerm.name,
                type: "place_to_go",
                acf: countryTerm.intro ? { destination_overview: countryTerm.intro } : {},
                featuredMedia: countryTerm.image
                  ? { url: countryTerm.image, width: 0, height: 0, alt: countryTerm.name }
                  : undefined,
                excerpt: countryTerm.description,
              }
        }
        tours={illustratedFirst(tours)}
        hotels={illustratedFirst(hotels)}
        places={illustratedFirst(places)}
        guides={illustratedFirst(guides)}
      />
      </>
    );
  }

  if (cleanPath.includes("places-to-visit") || cleanPath.includes("/guide/")) {
    return (
      <>
        <EditBar targets={editTargets({ content })} />
        <DestinationTemplateV2 data={content} />
      </>
    );
  }

  /* ── Category hubs ──
     Each fills from its own post types, so no hub shows another one's content. */
  if (cleanPath.startsWith("/journeys/")) {
    const items = await getArchiveSafe({ type: "tour", perPage: 24 });
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              collectionSchema({ name: content?.title || "Private Journeys", path: cleanPath, description: content?.excerpt, items: items }),
              breadcrumbSchema(cleanPath, content?.title || "Private Journeys"),
            )!,
          }}
        />
        <EditBar targets={editTargets({ content })} />
        <JourneysDirectoryTemplateV2 data={content} items={items} />
      </>
    );
  }

  if (cleanPath.startsWith("/cruises/")) {
    /* Cruise content lives in the asia-cruises category alongside the tours it
       belongs to, not in a post type of its own. */
    const items = await getArchiveSafe({
      type: "tour,travel_guide,blog",
      taxonomy: "category",
      term: "asia-cruises",
      perPage: 24,
    });
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              collectionSchema({ name: content?.title || "Asia Cruises", path: cleanPath, description: content?.excerpt, items: items }),
              breadcrumbSchema(cleanPath, content?.title || "Asia Cruises"),
            )!,
          }}
        />
        <EditBar targets={editTargets({ content })} />
        <CruisesDirectoryTemplateV2 data={content} items={items} />
      </>
    );
  }

  if (cleanPath.startsWith("/inspiration/") || cleanPath === "/inspirations/" || cleanPath === "/travel-ideas/") {
    const items = await getArchiveSafe({ type: "travel_guide,blog,thing_to_do", perPage: 24 });
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              collectionSchema({ name: content?.title || "Travel Inspiration", path: cleanPath, description: content?.excerpt, items: items }),
              breadcrumbSchema(cleanPath, content?.title || "Travel Inspiration"),
            )!,
          }}
        />
        <EditBar targets={editTargets({ content })} />
        <InspirationDirectoryTemplateV2 data={content} items={items} />
      </>
    );
  }

  /* ── Why Us / About Us ── */
  if (cleanPath.startsWith("/why-us/") || cleanPath === "/about-us/") {
    /* The page has one photograph of its own; the journeys it describes supply
       the rest rather than leaving a wall of text. */
    const journeys = await getArchiveSafe({ type: "tour", perPage: 8 });
    return (
      <>
        <EditBar
          targets={editTargets({
            content,
            extra: [
              { label: "Pillars & Guarantees", url: editPostUrl(content?.id), section: "pillars", group: "Các phần trên trang" },
              { label: "Our Story & Milestones", url: editPostUrl(content?.id), section: "story", group: "Các phần trên trang" },
              { label: "Team Members", url: editPostUrl(content?.id), section: "team", group: "Các phần trên trang" },
            ],
          })}
        />
        <WhyUsTemplateV2 data={content} gallery={illustratedFirst(journeys)} />
      </>
    );
  }

  /* ── Legacy country / "best time to visit" pages ──
     These came across as plain pages but carry a full destination guide, so they
     render with the destination template rather than a generic listing. */
  if (content?.type === "page") {
    const acf = (content.acf || {}) as Record<string, unknown>;
    const hasGuide = ["month_guide", "best_time_html", "popular_places_html", "trip_ideas_html", "experiences_html"].some(
      (key) => {
        const value = acf[key];
        return Array.isArray(value) ? value.length > 0 : Boolean(value);
      },
    );
    if (hasGuide) return (
      <>
        <EditBar targets={editTargets({ content })} />
        <DestinationTemplateV2 data={content} />
      </>
    );
    /* Standalone static page (Terms, Privacy, About, Team, etc.) with related journeys */
    if (content.content) return renderPage(content);

    /* Region hubs like /southeast-asia-tours/ are empty posts on the legacy
       site - their content came from a PHP template that queried live. Rather
       than 404 a page the menu links to, list what belongs to that region. */
    const REGION_BY_SLUG: Record<string, string> = {
      "southeast-asia": "southeast",
      "east-asia": "east",
      "south-asia": "south",
      "himalaya": "himalaya",
      "islands": "isles",
      "silk-road": "silkroad",
    };
    const regionKey = REGION_BY_SLUG[content.slug.replace(/-tours$/, "")];
    const [countries, archive] = await Promise.all([
      getTermsSafe("country"),
      getArchiveSafe({ type: "place_to_go", perPage: 60 }),
    ]);
    const real = realCountries(countries);
    const scoped = regionKey ? real.filter((term) => term.region === regionKey) : real;
    return (
      <>
        <EditBar targets={editTargets({ content })} />
        <AllDestinationsTemplateV2 data={content} items={archive} countries={scoped} />
      </>
    );
  }

  /* ── Listings ──
     Anything still unmatched is genuinely missing: showing a stand-in tour told
     visitors a journey existed when it did not. */
  if (cleanPath === "/tours/" || cleanPath === "/journeys/") {
    const items = await getArchiveSafe({ type: "tour", perPage: 24 });
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              collectionSchema({ name: content?.title || "Private Asia Journeys", path: cleanPath, description: content?.excerpt, items: items }),
              breadcrumbSchema(cleanPath, content?.title || "Private Asia Journeys"),
            )!,
          }}
        />
        <EditBar targets={editTargets({ content })} />
        <TourListingTemplateV2 tours={items} />
      </>
    );
  }

  notFound();
}
