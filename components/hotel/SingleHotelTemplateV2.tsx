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

  const title = hotelData?.title || "The Address";
  /* Some properties have no photograph on the legacy site either, so the page
     borrows one from its own gallery or a related journey before falling back
     to the monogram plate. */
  const galleryFirst = (Array.isArray(acf.gallery) ? acf.gallery : []).find(
    (row: { image_url?: string }) => row?.image_url,
  ) as { image_url?: string } | undefined;
  const heroImage =
    hotelData?.featuredMedia?.url ||
    str(acf.hero_image) ||
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
