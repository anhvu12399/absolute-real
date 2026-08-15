"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";

import type { ArchiveItem } from "@/lib/wp";
import { GuideSections } from "./GuideSections";
import { SpecialistBlock } from "../v2/SpecialistBlock";
import { BRAND_SHORT } from "@/lib/site";
import { toLocalHref } from "@/lib/links";
import { bg, optimized } from "@/lib/images";

const RealMapComponent = dynamic(() => import("./RealMapComponent"), { ssr: false });

/* ============================================================
   V2 Destination Template
   Matches destination-vietnam.html pixel-for-pixel
   ============================================================ */

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Card blurbs are WordPress auto-excerpts and run far past the space. */
function clampCard(value: unknown, max = 110) {
  const text = String(value || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export default function DestinationTemplateV2({
  data,
  tours = [],
  hotels = [],
  places = [],
  guides = [],
}: {
  data?: any;
  /** Content of this country, queried by taxonomy - never another country's. */
  tours?: ArchiveItem[];
  hotels?: ArchiveItem[];
  places?: ArchiveItem[];
  guides?: ArchiveItem[];
}) {
  /* Everything below used to be hardcoded to Vietnam, so every imported place
     rendered Vietnam's copy under its own title. */
  const acfData = (data?.acf || {}) as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const fullName = data?.title || "Asia";
  /* Imported titles read like headlines ("Seoul: A City That Never Stands
     Still"); inline labels want just the place. */
  const name = fullName.split(/[:|–—]/)[0].trim() || fullName;

  /* Photographs and place names belonging to *this* destination. Country pages
     have no record of their own, so without these the page had nothing to show
     and fell back to a hero with no image. */
  /* Widest first. A hero is full-bleed, so on a retina screen it wants ~2600
     device pixels; the first photograph in the list is often a 1000px thumbnail
     and arrives visibly soft. Ordering by declared width costs nothing. */
  const ownPhotos = [...tours, ...places, ...hotels, ...guides]
    .filter((item) => item.featuredMedia?.url)
    .sort((a, b) => (b.featuredMedia?.width || 0) - (a.featuredMedia?.width || 0))
    .map((item) => item.featuredMedia!.url);
  const placeNames = places
    .map((item) => String(item.title || "").split(/[:|–—]/)[0].trim())
    .filter(Boolean);

  const heroImage = data?.featuredMedia?.url || str(acfData.hero_image) || ownPhotos[0] || "";
  /* Guide pages already carry a headline title; destinations get the framing. */
  const tagline = str(acfData.hero_tagline) || (data?.type === "page" ? fullName : `Private Journeys in ${name}`);
  /* WordPress auto-excerpts repeat the body's opening heading, which would show
     the same sentence in both columns. Comparing the raw strings was not enough:
     the excerpt is plain text while the heading still carries entities and
     stray spacing ("Tours : Tailor-Made &#038; Luxury"), so both sides are
     flattened to letters before the prefix test. */
  const rawContent = String(data?.content || "");
  const headingMatch = rawContent.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  const headingText = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, "").trim() : "";
  const flatten = (value: string) =>
    value
      .replace(/&#?[a-z0-9]+;/gi, " ")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

  const rawExcerpt = String(data?.excerpt || "").replace(/<[^>]+>/g, "").trim();
  const flatHeading = flatten(headingText);
  let dedupedExcerpt = rawExcerpt;
  if (flatHeading && flatten(rawExcerpt).startsWith(flatHeading)) {
    /* Walk the plain excerpt until as many letters as the heading have gone by,
       so the cut lands after the heading rather than at a guessed offset. */
    let seen = 0;
    let cut = 0;
    while (cut < rawExcerpt.length && seen < flatHeading.length) {
      if (/[a-z0-9]/i.test(rawExcerpt[cut])) seen++;
      cut++;
    }
    dedupedExcerpt = rawExcerpt.slice(cut).replace(/^[\s:–—-]+/, "").trim();
  }
  /* One paragraph, not the whole article, in a display-size serif. */
  if (dedupedExcerpt.length > 240) {
    const clipped = dedupedExcerpt.slice(0, 240);
    const stop = clipped.lastIndexOf(". ");
    dedupedExcerpt = `${stop > 80 ? clipped.slice(0, stop + 1) : clipped.trimEnd()}…`;
  }

  /* The body opens with the same heading the hero already showed. */
  const bodyHtml =
    headingMatch && flatHeading && rawContent.trimStart().startsWith("<h")
      ? rawContent.replace(headingMatch[0], "")
      : rawContent;

  /* Written from this destination's own entries. The old fallback described
     Vietnam, so every other country published Vietnam's opening line. */
  const leadPlaces = placeNames.slice(0, 3);
  const composedOverview =
    leadPlaces.length >= 2
      ? `${name} on your own terms: ${leadPlaces.slice(0, -1).join(", ")} and ${leadPlaces.at(-1)}, routed at the pace you want to travel.`
      : `${name} on your own terms — routed privately, at the pace you want to travel.`;
  /* WordPress builds the excerpt from the body's opening words, so printing
     both put the same sentence in the display column and in the prose beside
     it. Rather than drop the page's own words for something generated, the
     opening paragraph moves up into the display column and comes out of the
     prose - the reader gets the page as written, once, with a standfirst. */
  const bodyText = bodyHtml.replace(/<[^>]+>/g, " ").trim();
  const excerptEchoesBody =
    dedupedExcerpt.length > 0 &&
    flatten(bodyText).startsWith(flatten(dedupedExcerpt).slice(0, 60)) &&
    flatten(dedupedExcerpt).length > 30;

  const firstPara = bodyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const firstParaText = firstPara ? firstPara[1].replace(/<[^>]+>/g, "").trim() : "";
  const liftParagraph = excerptEchoesBody && firstParaText.length > 60;
  /* Set at 2.2rem, anything past a couple of sentences dwarfs the column
     beside it. Cut at a sentence end, not mid-word. */
  const trimDisplay = (value: string, max = 190) => {
    if (value.length <= max) return value;
    const clipped = value.slice(0, max);
    const stop = clipped.lastIndexOf(". ");
    return stop > 70 ? clipped.slice(0, stop + 1) : `${clipped.trimEnd()}…`;
  };

  const bodyRest = liftParagraph && firstPara ? bodyHtml.replace(firstPara[0], "") : bodyHtml;
  const overview = trimDisplay(
    str(acfData.destination_overview) ||
      (liftParagraph ? firstParaText : excerptEchoesBody ? composedOverview : dedupedExcerpt) ||
      composedOverview,
  );
  const country = data?.terms?.find((t: any) => t.taxonomy === "country" || t.taxonomy === "category");
  /* Editor-picked relations win; otherwise everything filed under this country. */
  const relatedTours = data?.related?.featured_tours?.length
    ? data.related.featured_tours
    : data?.related?.related_tours?.length
      ? data.related.related_tours
      : tours;
  const relatedPlaces = data?.related?.related_places?.length ? data.related.related_places : places;
  const relatedHotels = data?.related?.related_hotels?.length ? data.related.related_hotels : hotels;
  const parse = (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.startsWith("[")) {
      try { return JSON.parse(value); } catch { return []; }
    }
    return [];
  };
  const [storyOpen, setStoryOpen] = useState(false);
  const testimonials = parse(acfData.testimonials);
  const experiences = parse(acfData.experiences);

  /* Photographs from this country, lent to entries that have none of their own
     so a grid never mixes real plates with flat colour. Editor-picked entries
     count too, which is why this is wider than the hero's pool. */
  const countryPhotos = [
    ...new Set([
      ...[...relatedTours, ...relatedPlaces, ...relatedHotels, ...guides]
        .map((item: { featuredMedia?: { url?: string } }) => item.featuredMedia?.url)
        .filter((url: string | undefined): url is string => Boolean(url)),
      ...ownPhotos,
    ]),
  ];

  let lent = 0;
  const withPhoto = <T extends { featuredMedia?: { url?: string } | null }>(item: T): T => {
    if (item.featuredMedia?.url || !countryPhotos.length) return item;
    return { ...item, featuredMedia: { url: countryPhotos[lent++ % countryPhotos.length], alt: "" } };
  };

  const mapHeadline = str(acfData.map_headline) || `${name}, charted by hand`;
  const mapDesc = str(acfData.map_description);

  /* Map stops, in order of trust: the editor's own list, this country's places
     with imported coordinates, then the stops of its tours' itineraries. */
  const stopFromPlace = (item: ArchiveItem) => {
    const itemAcf = (item.acf || {}) as Record<string, unknown>;
    const lat = Number(itemAcf.latitude);
    const lng = Number(itemAcf.longitude);
    const label = (typeof itemAcf.location_map === "string" && itemAcf.location_map) || item.title;
    return {
      key: String(label).toLowerCase().replace(/[^a-z0-9]/g, ""),
      label: String(label),
      ...(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : {}),
    };
  };

  const listedStops = str(acfData.map_stops)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((label) => ({ key: label.toLowerCase().replace(/[^a-z0-9]/g, ""), label }));

  const placeStops = relatedPlaces
    .map((place: ArchiveItem) => stopFromPlace(place))
    .filter((stop: { lat?: number }) => stop.lat !== undefined);

  const itineraryStops = relatedTours
    .flatMap((tour: any) => {
      const rows = (tour.acf?.itinerary || []) as Array<Record<string, string>>;
      return Array.isArray(rows) ? rows : [];
    })
    .map((row: Record<string, string>) => {
      const label = (row.group_tag || "").trim();
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      return label
        ? {
            key: label.toLowerCase().replace(/[^a-z0-9]/g, ""),
            label,
            ...(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : {}),
          }
        : null;
    })
    .filter(Boolean) as Array<{ key: string; label: string; lat?: number; lng?: number }>;

  const candidateStops = listedStops.length
    ? listedStops
    : placeStops.length
      ? placeStops
      : itineraryStops.length
        ? itineraryStops
        : relatedPlaces.slice(0, 8).map((place: ArchiveItem) => stopFromPlace(place));

  type MapStop = { key: string; label: string; lat?: number; lng?: number };
  const mapStops = Array.from(
    new Map((candidateStops as MapStop[]).map((stop) => [stop.key, stop])).values(),
  ).slice(0, 10);
  const gallery = (Array.isArray(acfData.gallery) ? acfData.gallery : []) as Array<{ image_url?: string; caption?: string }>;

  const [activeTab, setActiveTab] = useState("private");
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("journeys");

  const testiTrackRef = useRef<HTMLDivElement>(null);
  const expTrackRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 180;
      const sections = ["journeys", "experiences", "hotels", "map", "explore"].map(id => document.getElementById(id));
      let current = "journeys";
      sections.forEach(sec => { if (sec && sec.offsetTop <= pos) current = sec.id; });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* --- reveal & map animation --- */
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal:not(.is-visible)");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { reveals.forEach((el) => el.classList.add("is-visible")); }
    else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); } });
      }, { threshold: 0.12 });
      reveals.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }
  }, []);

  useEffect(() => {
    const path = routeRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          path.classList.add("is-drawn");
          requestAnimationFrame(() => { path.style.strokeDashoffset = "0"; });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    io.observe(path);
    return () => io.disconnect();
  }, []);

  const [activeToggle, setActiveToggle] = useState("private");

  return (
    <>
      {/* ═══ CINEMATIC LUXURY HERO & STORY ═══ */}
      <section id="overview" className="section on-cream" style={{ paddingTop: "2.2rem", paddingBottom: "3.5rem" }}>
        <div className="container">
          {/* Breadcrumb */}
          <p className="crumb" style={{ marginBottom: "1.4rem" }}>
            <Link href="/">{BRAND_SHORT}</Link><span>/</span>
            <Link href="/destinations/">Destinations</Link><span>/</span>
            {country && (
              <>
                <Link href={country.path || "/destinations/"}>{country.name}</Link><span>/</span>
              </>
            )}
            <span className="current">{fullName}</span>
          </p>

          {/* Cinematic Wide Photo Frame */}
          <div style={{ position: "relative", width: "100%", height: "clamp(380px, 52vh, 560px)", borderRadius: "6px", overflow: "hidden", boxShadow: "0 20px 50px rgba(30,42,61,0.12)" }}>
            {heroImage && <Image src={heroImage} alt="" fill priority loading="eager" fetchPriority="high" sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 35%" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.15) 0%, rgba(14,20,28,0.78) 100%)" }} />
            
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "clamp(2rem, 4vw, 3.5rem)", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "var(--brass)", fontSize: "0.74rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.6rem" }}>
                  <span style={{ width: "24px", height: "1px", background: "var(--brass)" }} />
                  <span>Curated Destination Guide</span>
                </div>
                <h1 style={{ color: "var(--white)", fontSize: "clamp(2.4rem, 5vw, 4.2rem)", lineHeight: 1.05, fontWeight: 400 }}>
                  {tagline}
                </h1>
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <Link href="#journeys" className="btn" style={{ background: "var(--cream)", color: "var(--ink)", border: "none" }}>
                  Explore Journeys <ArrowSvg/>
                </Link>
              </div>
            </div>
          </div>

          {/* Editorial Story Layout (Two Columns below Cinema Banner) */}
          <div className="dest-essence" style={{ marginTop: "2.6rem" }}>
            <div>
              <p className="eyebrow"><em>The</em> Essence of {name}</p>
              <h2 style={{ fontSize: "clamp(1.6rem, 2.6vw, 2.2rem)", fontFamily: "'Playfair Display', serif", fontWeight: 400, lineHeight: 1.45, color: "var(--ink)", marginTop: "0.8rem" }}>
                {overview}
              </h2>
            </div>

            <div style={{ paddingTop: "0.4rem" }}>
              {bodyRest.replace(/<[^>]+>/g, "").trim() ? (
                /* Imported country copy runs to a thousand words. It opens at a
                   readable height and the reader asks for the rest. */
                <div className={`dest-prose${storyOpen ? " is-open" : ""}`}>
                  <div
                    className="wordpress-content"
                    style={{ color: "var(--text-dim-on-cream)", fontSize: "0.98rem", lineHeight: 1.8 }}
                    dangerouslySetInnerHTML={{ __html: bodyRest }}
                  />
                  {!storyOpen && <span className="dest-prose-fade" aria-hidden="true" />}
                  <button type="button" className="dest-prose-toggle" onClick={() => setStoryOpen((v) => !v)}>
                    {storyOpen ? "Show less" : "Read more"}
                  </button>
                </div>
              ) : (
                <>
                  {/* Names the places this destination actually holds. The
                      paragraph here used to describe Vietnam regardless. */}
                  <p style={{ color: "var(--text-dim-on-cream)", fontSize: "0.98rem", lineHeight: 1.8 }}>
                    {placeNames.length > 0
                      ? `Our specialists work across ${placeNames.slice(0, 5).join(", ")}${placeNames.length > 5 ? " and further afield" : ""} — and they have travelled every one of them.`
                      : `Our specialists have travelled ${name} themselves, and build each route from what they found there.`}
                    {relatedHotels.length > 0 &&
                      ` We hold ${relatedHotels.length} ${relatedHotels.length === 1 ? "stay" : "stays"} in ${name} that we know personally, rather than a directory of whatever is available.`}
                  </p>
                  <p style={{ color: "var(--text-dim-on-cream)", marginTop: "1.2rem", fontSize: "0.98rem", lineHeight: 1.8 }}>
                    We route each bespoke journey to your exact rhythm — supported by hand-selected luxury boutique stays, private local guides, and personal chauffeurs throughout.
                  </p>
                </>
              )}

              <div style={{ marginTop: "1.8rem", display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <Link href="#map" className="link-arrow" style={{ fontSize: "0.82rem", letterSpacing: "0.1em" }}>
                  VIEW ROUTE MAP ↓
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SUBNAV ═══ */}
      <nav className="tour-subnav" id="tourSubnav">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", background: "none", border: "none", cursor: "pointer", color: "var(--ink)", paddingBottom: "0.3rem" }}>
            Back to Top <svg style={{ width: "16px", height: "16px", transform: "rotate(-90deg)" }}><use href="#i-arrow"></use></svg>
          </button>
          
          <div className="tour-subnav-inner" style={{ flex: 1, justifyContent: "center" }}>
            <Link href="#journeys" className={activeSection === "journeys" ? "is-active" : ""}>Our Journeys</Link>
            <Link href="#experiences" className={activeSection === "experiences" ? "is-active" : ""}>Experiences</Link>
            <Link href="#hotels" className={activeSection === "hotels" ? "is-active" : ""}>Where to Stay</Link>
            <Link href="#map" className={activeSection === "map" ? "is-active" : ""}>Map</Link>
            <Link href="#explore" className={activeSection === "explore" ? "is-active" : ""}>Ways to Explore</Link>
          </div>
          
          <div style={{ width: "100px" }}></div>
        </div>
      </nav>

      {/* ═══ JOURNEYS ═══ */}
      <section className="section on-white" id="journeys">
        <div className="container">
          {/* The heading and the line under it are WordPress's - they were
              fixed English, which meant every country page announced the same
              sentence and no editor could change one of them. */}
          <div className="center reveal">
            <p className="eyebrow"><em>Our</em> Favorite Journeys</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.4rem)" }}>
              {text(acfData.related_title) || `${name}, at Its Best Right Now`}
            </h2>
            {text(acfData.related_description) && (
              <p style={{ marginTop: "0.9rem", maxWidth: "58ch", marginInline: "auto" }}>
                {text(acfData.related_description)}
              </p>
            )}
          </div>

          {relatedTours.length > 0 ? (
            relatedTours.map((tour: any) => (
              <div className="journey-row reveal" key={tour.id}>
                <div
                  className={`journey-photo ph ${tour.featuredMedia?.url ? "" : "ph-vn"}`}
                  style={tour.featuredMedia?.url ? bg(tour.featuredMedia.url, "card") : undefined}
                >
                  <span className="journey-tag">{tour.categories?.[0]?.name || "Tailor-Made"}</span>
                </div>
                <div className="journey-panel">
                  <h3>{tour.title}</h3>
                  {tour.duration && <p className="journey-days">{tour.duration}</p>}
                  <p className="journey-desc">{tour.excerpt}</p>
                  <div className="journey-foot">
                    {tour.price && <p className="journey-price">From <strong>{tour.price}</strong> per person</p>}
                    <Link href={tour.path} className="btn btn-fill-ink">Refine Journey</Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* No borrowed itineraries: an empty country says so and offers the
               planning route instead. */
            <div className="center reveal" style={{ padding: "2rem 0" }}>
              <p style={{ color: "var(--text-dim-on-cream)" }}>
                We are composing new {name} itineraries right now. Tell us what you have in mind and a designer will build one around you.
              </p>
              <div style={{ marginTop: "1.2rem" }}>
                <Link href="/#plan" className="btn btn-fill-ink">Design a {name} Journey</Link>
              </div>
            </div>
          )}

          {relatedPlaces.length > 0 && (
            <div className="card-grid reveal" style={{ marginTop: "2.6rem" }}>
              {relatedPlaces.map(withPhoto).map((place: any) => (
                <div className="offer-card" key={place.id}>
                  <div
                    className="offer-photo ph"
                    style={place.featuredMedia?.url ? bg(place.featuredMedia.url, "card") : undefined}
                  />
                  <h3>{place.title}</h3>
                  <p className="desc">{place.excerpt}</p>
                  <Link href={place.path} className="link-arrow">Discover<ArrowSvg /></Link>
                </div>
              ))}
            </div>
          )}

          <div className="center reveal" style={{ marginTop: "2.6rem" }}><Link href="/tours/" className="btn btn-line-ink">View All Journeys</Link></div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      {testimonials.length > 0 && (
        <section className="section on-cream" id="testimonials">
          <div className="container">
            <div className="hcarousel-head reveal">
              <div><p className="eyebrow">{text(acfData.testimonials_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acfData.testimonials_eyebrow) }} /> : <><em>Testimonials</em></>}</p><h2 style={{ fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}>{text(acfData.testimonials_heading) || `Travelers on ${name} with ${BRAND_SHORT}`}</h2></div>
              <div className="hcarousel-arrows">
                <button className="hc-btn" aria-label="Previous" onClick={() => testiTrackRef.current?.scrollBy({ left: -360, behavior: "smooth" })}><svg style={{ transform: "rotate(180deg)" }}><use href="#i-arrow"></use></svg></button>
                <button className="hc-btn" aria-label="Next" onClick={() => testiTrackRef.current?.scrollBy({ left: 360, behavior: "smooth" })}><svg><use href="#i-arrow"></use></svg></button>
              </div>
            </div>
            <div className="hcarousel-track reveal" ref={testiTrackRef}>
              {testimonials.map((item: any, idx: number) => (
                <div className="testi-card" key={idx}>
                  <q>{String(item.content || "")}</q>
                  <div className="testi-who">
                    <div className="testi-thumb ph" style={item.avatar ? bg(item.avatar, "card") : undefined}></div>
                    <div>
                      <div className="testi-name">{String(item.user_name || "")}</div>
                      <div className="testi-trip">{String(item.date || "")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ EXPERIENCES ═══ */}
      {experiences.length > 0 && (
        <section className="section on-white" id="experiences">
          <div className="container">
            <div className="hcarousel-head reveal">
              <div><p className="eyebrow">{text(acfData.experiences_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acfData.experiences_eyebrow) }} /> : <><em>Amazing</em> Experiences</>}</p><h2 style={{ fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}>{text(acfData.experiences_heading) || `Bring Your ${name} Journey to Life`}</h2></div>
              <div className="hcarousel-arrows">
                <button className="hc-btn" aria-label="Previous" onClick={() => expTrackRef.current?.scrollBy({ left: -300, behavior: "smooth" })}><svg style={{ transform: "rotate(180deg)" }}><use href="#i-arrow"></use></svg></button>
                <button className="hc-btn" aria-label="Next" onClick={() => expTrackRef.current?.scrollBy({ left: 300, behavior: "smooth" })}><svg><use href="#i-arrow"></use></svg></button>
              </div>
            </div>
            <div className="hcarousel-track reveal" ref={expTrackRef}>
              {experiences.map((item: any, idx: number) => (
                <Link
                  href={toLocalHref(item.link, "#plan")}
                  className="hc-card ph"
                  key={idx}
                  style={item.image_url ? bg(item.image_url, "card") : undefined}
                >
                  <div className="overlay-bottom"></div>
                  <h3>{String(item.title || "")}</h3>
                  <p>{clampCard(item.description, 110)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ HOTELS ═══ */}
      {relatedHotels.length > 0 && (
        <section className="section on-cream" id="hotels">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow">{text(acfData.stays_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acfData.stays_eyebrow) }} /> : <><em>Recommended</em> Hotels</>}</p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{text(acfData.stays_heading) || `Choose Your ${name} Address`}</h2>
            </div>
            <div className="hcarousel-track reveal" style={{ justifyContent: "center" }}>
              {relatedHotels.map(withPhoto).map((hotel: any) => (
                <Link
                  href={hotel.path}
                  key={hotel.id}
                  className="hc-card ph"
                  style={{ aspectRatio: "3/4.4", ...(hotel.featuredMedia?.url ? bg(hotel.featuredMedia.url, "card") : {}) }}
                >
                  <div className="overlay-bottom"></div>
                  <h3>{hotel.title}</h3>
                  <p>{clampCard(hotel.excerpt, 110)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ MAP ═══ */}
      {mapStops.length > 0 && (
        <section className="section on-white" id="map">
          <div className="container map-grid">
            <div className="map-copy reveal">
              <p className="eyebrow">{text(acfData.route_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acfData.route_eyebrow) }} /> : <><em>Your</em> Route Through {name}</>}</p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{mapHeadline}</h2>
              {mapDesc && <p style={{ marginTop: "1.2rem" }}>{mapDesc}</p>}
              <div className="pill-list">
                {mapStops.map((c: any) => (
                  <button key={c.key} className={`pill${activeCity === c.key ? " is-active" : ""}`} onMouseEnter={() => setActiveCity(c.key)} onClick={() => setActiveCity(c.key)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="reveal" style={{ height: "480px", width: "100%" }}>
              <RealMapComponent stopsList={mapStops} activeCity={activeCity} setActiveCity={setActiveCity} />
            </div>
          </div>
        </section>
      )}

      {/* ═══ READ BEFORE YOU GO ═══ */}
      {guides.length > 0 && (
        <section className="section on-cream" id="explore">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow">{text(acfData.guides_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acfData.guides_eyebrow) }} /> : <><em>Read</em> Before You Go</>}</p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{text(acfData.guides_heading) || `Guides & Stories from ${name}`}</h2>
            </div>
            <div className="card-grid reveal" style={{ marginTop: "2.4rem" }}>
              {guides.slice(0, 6).map(withPhoto).map((guide) => (
                <Link href={guide.path} key={guide.id} className="offer-card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    className="offer-photo ph"
                    style={guide.featuredMedia?.url ? bg(guide.featuredMedia.url, "card") : undefined}
                  >
                    <span className="tag-badge">{guide.type === "blog" ? "Story" : "Guide"}</span>
                  </div>
                  <h3>{guide.title}</h3>
                  <p className="desc">{guide.excerpt}</p>
                  <span className="link-arrow">Read more<ArrowSvg /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sections imported from the legacy country pages. */}
      <GuideSections acf={acfData} />
      <SpecialistBlock acf={acfData} />

      {/* ═══ CTA ═══ */}
      <section className="section on-ink">
        <div className="container center reveal">
          <p className="eyebrow" style={{ justifyContent: "center" }}>{text(acfData.planning_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acfData.planning_eyebrow) }} /> : <><em>Start</em> Planning</>}</p>
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{text(acfData.planning_heading) || `Ready to see ${name} on your own terms?`}</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>Share a few details and a private travel designer will reach out within one business day.</p>
          <div style={{ marginTop: "1.8rem" }}><Link href="/#plan" className="btn btn-line-white">Plan My {name} Journey</Link></div>
        </div>
      </section>
    </>
  );
}
