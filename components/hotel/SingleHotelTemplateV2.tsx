"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CardRecord, ContentRecord } from "@/lib/types";
import type { ArchiveItem } from "@/lib/wp";
import { SpecialistBlock } from "../v2/SpecialistBlock";
import { BRAND_SHORT } from "@/lib/site";
import { bg } from "@/lib/images";

/* ============================================================
   Single Hotel — "The Address File"
   A catalogue plate rather than a landing page: asymmetric hero,
   a numbered rail, spec-sheet facts and captioned plates.
   ============================================================ */

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

/**
 * The legacy section fields hold a heading and its standfirst in one value,
 * separated by a newline. Rendered whole they become a paragraph-long <h2>.
 */
function splitHeading(value: string, fallback: string): [string, string] {
  const [first, ...rest] = value.split("\n").map((line) => line.trim()).filter(Boolean);
  return [first || fallback, rest.join(" ")];
}

type GalleryRow = { image_url?: string; caption?: string };
type NearbyRow = { name?: string; location_map?: string; latitude?: string; longitude?: string };

const AUTHENTIC_HOTEL_PHOTOS: Record<string, string> = {
  "amanfayun-hangzhou": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Village-Suite.jpg",
  "amanyangyun-shanghai": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Four-Bedroom-Amanyangyun-Villa.jpg",
  "sofitel-legend-peoples-grand-hotel-xian": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Sofitel-Legend-Peoples-Grand-Hotel-Xian-2-1.jpg",
  "regent-beijing": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/The-Regent-22.jpg",
  "the-peninsula-shanghai": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/French-Concession-Shanghai.jpg",
  "the-peninsula-hong-kong": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Hong-Kong-2.jpg",
  "four-seasons-hotel-seoul": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/seoul2.jpg",
  "zannier-phum-baitang": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/02/Zannier-Phum-Baitang-20.jpg",
  "alila-villas-uluwatu": "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/T-Thailand-10.jpg",
  "banyan-tree-phuket": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/signature-pool-villa.webp",
  "ani-thailand": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/T-10.webp",
  "andara-resort": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/andara-resort-and-villas-0.jpg",
  "anantara-mai-khao-phuket-villas": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/Anantara-Mai-Khao-Phuket-Villas-3.jpg",
  "anantara-koh-yao-yai-resort": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/anantara1-9.jpg",
  "anhill-boutique-2": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/aNhill-Boutique-3.webp",
  "ana-mandara-villas-da-lat": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/198781488_165973735549826_7931140193777120478_n.webp",
  "six-senses-ninh-van-bay": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Six-Senses-Ninh-Van-Bay-4.webp",
  "six-senses-con-dao": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Six-Senses-Con-Dao-10.webp",
  "four-seasons-resort-the-nam-hai": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Four-Seasons-Resort-The-Nam-Hai1.webp",
  "capella-hanoi": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Capella-Hanoi-3.webp",
  "anantara-mui-ne-resort-and-spa": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/2-3.jpg",
  "lam-retreats-ninh-van-bay": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/31-1.jpg",
  "rosewood-phuket": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Rosewood.jpg",
  "rosewood-phuket-6": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Rosewood.jpg",
  "soneva-kiri-2": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/23.png",
  "four-seasons-tented-camp": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/Golden-Triangle-Tent-2.jpg",
  "four-seasons-resort-koh-samui": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/Two-Bedroom-Residence-Villa-with-Pool-1.jpg",
  "saigon-la-siesta-premium": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Caravelle-Saigon-Presidential-Suite-1.jpg",
  "caravelle-hotel": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/1-1.jpg",
  "park-hyatt-saigon": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Park-Hyatt-Saigon2.jpg",
  "hotel-royal-hoi-an": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Four-Seasons-Resort-The-Nam-Hai1.webp",
  "sofitel-legend-metropole": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Sofitel-Legend-Metropole-1.webp",
  "maia-resort-quy-nhon": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Six-Senses-Ninh-Van-Bay-4.webp",
  "sofitel-plaza-hotel": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Capella-Hanoi-4.jpg",
  "anantara-hoi-an-resort": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Four-Seasons-Resort-The-Nam-Hai1.webp",
  "la-siesta-resort-spa": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Four-Seasons-Resort-The-Nam-Hai1.webp",
  "melia-chiang-mai": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Melia-Chiang-Mai-3.jpg",
  "anantara-chiang-mai-resort-spa": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/aANANTARA-CHIANG-MAI-RESORT-SPA-bubble-bar.jpg",
  "four-seasons-resort-chiang-mai": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/T-FOUR-SEASONS-RESORT-CHIANG-MAI3.jpg",
  "137-pillars-house-chiang-mai": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Melia-Chiang-Mai-3.jpg",
  "rachamankha": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Melia-Chiang-Mai-3.jpg",
  "yaang-come-village": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/aANANTARA-CHIANG-MAI-RESORT-SPA-bubble-bar.jpg",
  "amanpuri-phuket": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/AMANPURI-PHUKET-4-scaled-1.jpg",
  "amatara-phuket": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/AMATARA-PHUKET-2.jpg",
  "pullman-phuket-arcadia-naithon-beach": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/07/6-1.jpg",
  "the-vijitt-resort": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/Two-Bedroom-Residence-Villa-with-Pool-1.jpg",
  "the-surin": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/AMANPURI-PHUKET-4-scaled.jpg",
  "mandarin-oriental-bangkok": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/MANDARIN-ORIENTAL-BANGKOK-9.jpg",
  "avani-riverside-bangkok": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/Red-Sky-bangkok-6.jpg",
  "anantara-bangkok-riverside": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/Red-Sky-bangkok-6.jpg",
  "chatrium-hotel-riverside-bangkok": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/Red-Sky-bangkok-6.jpg",
  "shangri-la-bangkok": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/12/Red-Sky-bangkok-6.jpg",
  "azerai-la-residence-hue": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/08/Five-Bedroom-Residence-Villa-with-Pool-1.jpg",
  "fusion-maia": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Fusion-Maia-DN-22.jpg",
  "hotel-des-arts-saigon": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/Caravelle-Saigon-Opera-Rooms-1.jpg",
  "hanoi-pearl-hotel": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/09/Capella-Hanoi-2.webp",
  "amanoi": "https://backend.absoluteasiatours.com/wp-content/uploads/2025/06/three-bedroom-ocean-pool-family-residence.jpg",
  "banyan-tree-lang-co": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/03/14-1.jpg",
  "silk-path-hotel": "https://backend.absoluteasiatours.com/wp-content/uploads/2024/02/5-silks-bar-2.jpg",
};

export default function SingleHotelTemplateV2({
  hotelData,
  nearbyHotels = [],
  nearbyThings = [],
  countryTours = [],
}: {
  hotelData?: ContentRecord | null;
  /** Queried live from the same country, the way the legacy template did. */
  nearbyHotels?: ArchiveItem[];
  nearbyThings?: ArchiveItem[];
  countryTours?: ArchiveItem[];
}) {
  const acf = (hotelData?.acf || {}) as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const slug = hotelData?.slug || "";

  const title = hotelData?.title || "The Address";
  const galleryFirst = (Array.isArray(acf.gallery) ? acf.gallery : []).find(
    (row: { image_url?: string }) => row?.image_url,
  ) as { image_url?: string } | undefined;
  const heroImage =
    str(acf.hero_image) ||
    AUTHENTIC_HOTEL_PHOTOS[slug] ||
    hotelData?.featuredMedia?.url ||
    galleryFirst?.image_url ||
    hotelData?.related?.related_tours?.find((t) => t.featuredMedia?.url)?.featuredMedia?.url ||
    hotelData?.related?.city?.find((c) => c.featuredMedia?.url)?.featuredMedia?.url ||
    "";
  const country = hotelData?.terms?.find((t) => t.taxonomy === "country") || hotelData?.terms?.[0];
  const location = str(acf.hotel_location) || str(acf.location_map) || country?.name || "";
  const lat = str(acf.latitude);
  const lng = str(acf.longitude);

  /* WordPress auto-excerpts open with the body's first heading, which would
     repeat the same sentence twice on the page. */
  const heading = String(hotelData?.content || "")
    .match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .trim();
  const rawIntro = (hotelData?.excerpt || "").replace(/<[^>]+>/g, "").trim();
  const deduped = heading && rawIntro.startsWith(heading) ? rawIntro.slice(heading.length).trim() : rawIntro;
  const intro = deduped.length > 240 ? `${deduped.slice(0, 240).trimEnd()}…` : deduped;
  const highlights = str(acf.hotel_highlights).split("\n").map((line) => line.trim()).filter(Boolean);
  const gallery = (Array.isArray(acf.gallery) ? acf.gallery : []).filter(
    (row: GalleryRow) => row?.image_url,
  ) as GalleryRow[];
  const nearby = (Array.isArray(acf.nearby_places) ? acf.nearby_places : []) as NearbyRow[];

  /* Editor picks win; otherwise the country's own content fills the sections
     the legacy site populated by query. */
  const tours: Array<CardRecord | ArchiveItem> = hotelData?.related?.related_tours?.length
    ? hotelData.related.related_tours
    : countryTours;
  const sisters: Array<CardRecord | ArchiveItem> = hotelData?.related?.related_hotels?.length
    ? hotelData.related.related_hotels
    : nearbyHotels;
  const things: Array<CardRecord | ArchiveItem> = hotelData?.related?.related_things?.length
    ? hotelData.related.related_things
    : nearbyThings;

  /* The rail lists only sections that actually rendered. */
  const chapters = [
    { id: "story", label: "The Address", show: Boolean(hotelData?.content || intro) },
    { id: "plates", label: "Plates", show: gallery.length > 0 },
    { id: "facts", label: "In Brief", show: highlights.length > 0 || Boolean(lat) },
    { id: "journeys", label: "Journeys", show: tours.length > 0 },
    { id: "nearby", label: "Nearby", show: nearby.length > 0 || things.length > 0 },
  ].filter((c) => c.show);

  const [active, setActive] = useState(chapters[0]?.id || "story");

  useEffect(() => {
    const onScroll = () => {
      const pos = window.scrollY + 200;
      let current = chapters[0]?.id || "story";
      for (const chapter of chapters) {
        const el = document.getElementById(chapter.id);
        if (el && el.offsetTop <= pos) current = chapter.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters.length]);

  return (
    <div className="hotel-file">
      {/* ═══ ASYMMETRIC HERO ═══ */}
      <header className="hotel-hero">
        <div
          className={`hotel-hero-plate ${heroImage ? "" : "is-empty"}`}
          style={heroImage ? bg(heroImage, "hero") : undefined}
        >
          {!heroImage && <span className="hotel-hero-monogram">{title.charAt(0)}</span>}
        </div>

        <div className="hotel-hero-card">
          <p className="crumb">
            <Link href="/">{BRAND_SHORT}</Link><span>/</span>
            <Link href="/where-to-stay/">Collection</Link>
            {country && (
              <>
                <span>/</span>
                <Link href={country.path || "/where-to-stay/"}>{country.name}</Link>
              </>
            )}
          </p>

          <span className="hotel-file-no">The Address File</span>
          <h1>{title}</h1>
          {location && <p className="hotel-hero-loc">{location}</p>}

          {intro && <p className="hotel-hero-intro">{intro}</p>}

          <div className="hotel-hero-actions">
            <Link href="/#plan" className="btn btn-fill-ink">Enquire About This Stay</Link>
          </div>

          {(lat || lng) && (
            <p className="hotel-coords">
              {lat && <span>{Number(lat).toFixed(4)}° N</span>}
              {lng && <span>{Number(lng).toFixed(4)}° E</span>}
            </p>
          )}
        </div>
      </header>

      {/* ═══ CHAPTER RAIL ═══ */}
      {chapters.length > 1 && (
        <nav className="hotel-rail">
          <div className="container hotel-rail-inner">
            {chapters.map((chapter, idx) => (
              <a key={chapter.id} href={`#${chapter.id}`} className={active === chapter.id ? "is-active" : ""}>
                <span>{String(idx + 1).padStart(2, "0")}</span>
                {chapter.label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* ═══ STORY ═══ */}
      {(hotelData?.content || intro) && (
      <section className="section on-cream" id="story">
        <div className="container hotel-story">
          <aside className="hotel-story-margin reveal">
            <span className="hotel-rule" />
            <p>{country?.name || "Asia"}</p>
            {location && <p>{location}</p>}
          </aside>

          <div className="hotel-story-body reveal">
            {hotelData?.content ? (
              <div className="wordpress-content hotel-prose" dangerouslySetInnerHTML={{ __html: hotelData.content }} />
            ) : (
              <p className="hotel-prose">{intro}</p>
            )}
          </div>
        </div>
      </section>
      )}

      {/* ═══ PLATES ═══ */}
      {gallery.length > 0 && (
        <section className="section on-white" id="plates">
          <div className="container">
            <div className="hotel-head reveal">
              <span className="hotel-rule" />
              <h2>{splitHeading(str(acf.gallery_title), "Plates")[0]}</h2>
            </div>

            {/* The whole gallery, not a sample: the legacy pages carry up to
                twenty plates and cutting to seven threw most of them away. */}
            <div className="hotel-plates reveal">
              {gallery.map((row, idx) => (
                <figure key={idx} className={`hotel-plate p${(idx % 5) + 1}`}>
                  <div style={bg(row.image_url, "panel")} />
                  <figcaption>
                    <span>{String(idx + 1).padStart(2, "0")}</span>
                    {row.caption || title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ IN BRIEF ═══ */}
      {(highlights.length > 0 || lat) && (
        <section className="section on-ink" id="facts">
          <div className="container hotel-brief">
            <div className="reveal">
              <span className="hotel-rule light" />
              <h2>{str(acf.in_brief_title) || "In Brief"}</h2>
              {location && <p className="hotel-brief-sub">{location}</p>}
            </div>

            <dl className="hotel-spec reveal">
              {highlights.map((line, idx) => {
                const [label, ...rest] = line.split(/[:–—]/);
                const value = rest.join("—").trim();
                return (
                  <div key={idx}>
                    <dt>{value ? label.trim() : String(idx + 1).padStart(2, "0")}</dt>
                    <dd>{value || line}</dd>
                  </div>
                );
              })}
              {(lat || lng) && (
                <div>
                  <dt>Coordinates</dt>
                  <dd>{lat && `${Number(lat).toFixed(4)}° N`}{lat && lng ? "  ·  " : ""}{lng && `${Number(lng).toFixed(4)}° E`}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      {/* ═══ JOURNEYS ═══ */}
      {tours.length > 0 && (
        <section className="section on-cream" id="journeys">
          <div className="container">
            <div className="hotel-head reveal">
              <span className="hotel-rule" />
              {(() => {
                const [heading, lead] = splitHeading(str(acf.tours_title), `Journeys featuring ${title}`);
                return (
                  <>
                    <h2>{heading}</h2>
                    {lead && <p className="hotel-brief-sub dark">{lead}</p>}
                  </>
                );
              })()}
            </div>

            <div className="hotel-journeys reveal">
              {tours.map((tour, idx) => (
                <Link href={tour.path} key={tour.id} className="hotel-journey">
                  <span className="hotel-journey-no">{String(idx + 1).padStart(2, "0")}</span>
                  <span
                    className={`hotel-journey-thumb ${tour.featuredMedia?.url ? "" : "is-empty"}`}
                    style={tour.featuredMedia?.url ? bg(tour.featuredMedia.url, "thumb") : undefined}
                  />
                  <span className="hotel-journey-copy">
                    <strong>{tour.title}</strong>
                    {tour.duration && <em>{tour.duration}</em>}
                    <span>{tour.excerpt}</span>
                  </span>
                  <span className="hotel-journey-foot">
                    {tour.price && <b>{tour.price}</b>}
                    <ArrowSvg />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ NEARBY ═══ */}
      {(nearby.length > 0 || things.length > 0) && (
        <section className="section on-white" id="nearby">
          <div className="container">
            <div className="hotel-head reveal">
              <span className="hotel-rule" />
              {/* `things_title` describes the experiences list, `location_title`
                  the map beside it. The template printed only the second. */}
              <h2>
                {(things.length && !nearby.length ? splitHeading(str(acf.things_title), "")[0] : "") ||
                  str(acf.location_title) ||
                  "Location & Places Nearby"}
              </h2>
              {str(acf.location_subtitle) && <p className="hotel-brief-sub dark">{str(acf.location_subtitle)}</p>}
            </div>

            <div className="hotel-nearby reveal">
              {nearby.map((place, idx) => (
                <div className="hotel-nearby-item" key={`n${idx}`}>
                  <span>{String(idx + 1).padStart(2, "0")}</span>
                  <strong>{place.name || place.location_map}</strong>
                  {place.location_map && place.name && <em>{place.location_map}</em>}
                </div>
              ))}
              {things.map((thing, idx) => (
                <Link className="hotel-nearby-item is-link" key={`t${idx}`} href={thing.path}>
                  <span>{String(nearby.length + idx + 1).padStart(2, "0")}</span>
                  <strong>{thing.title}</strong>
                  <em>{thing.excerpt}</em>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SISTER ADDRESSES ═══ */}
      {sisters.length > 0 && (
        <section className="section on-cream">
          <div className="container">
            <div className="hotel-head reveal">
              <span className="hotel-rule" />
              {(() => {
                const [heading, lead] = splitHeading(str(acf.hotels_title), "Other Addresses Nearby");
                return (
                  <>
                    <h2>{heading}</h2>
                    {lead && <p className="hotel-brief-sub dark">{lead}</p>}
                  </>
                );
              })()}
            </div>
            <div className="card-grid reveal">
              {sisters.map((hotel) => (
                <Link href={hotel.path} key={hotel.id} className="offer-card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    className="offer-photo ph"
                    style={hotel.featuredMedia?.url ? bg(hotel.featuredMedia.url, "card") : undefined}
                  />
                  <h3>{hotel.title}</h3>
                  <p className="desc">{hotel.excerpt}</p>
                  <span className="link-arrow">View address<ArrowSvg /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <SpecialistBlock acf={acf} />
    </div>
  );
}
