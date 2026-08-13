"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ContentRecord, DepartureRow, FaqRow, GalleryRow, ItineraryRow } from "@/lib/types";
import type { ArchiveItem, SitePayload } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { bg, optimized } from "@/lib/images";

const RealMapComponent = dynamic(() => import("../destination/RealMapComponent"), { ssr: false });

function ArrowSvg() { return <svg><use href="#i-arrow"></use></svg>; }

/** Card blurbs are WordPress auto-excerpts and run far past the space. */
function clampText(value: unknown, max = 110) {
  const text = String(value || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
function ChevronSvg() { return <svg><use href="#i-chevron"></use></svg>; }
function SparkleSvg() { return <svg><use href="#i-sparkle"></use></svg>; }
function CheckSvg() { return <svg><use href="#i-check"></use></svg>; }

/* The six lines this section shows were fixed English in the template, and one
   of them stated the company's age. They live on the homepage now, reachable
   from any page through the site payload. */
const FALLBACK_REASONS = [
  { icon: "guide", text: "English-speaking guides who live in the country you're visiting" },
  { icon: "chat", text: "A private travel designer reachable throughout your trip" },
  { icon: "key", text: "Hand-selected hotels chosen for character, not chain" },
  { icon: "car", text: "Private transfers and drivers for a seamless day-to-day" },
];

export default function SingleTourTemplateV2({
  tourData,
  nearbyStays = [],
  site,
}: {
  tourData?: ContentRecord;
  /** Stays in the same country, for journeys with no hand-picked hotels. */
  nearbyStays?: ArchiveItem[];
  site?: SitePayload | null;
}) {
  const reasons = site?.whyReasons?.length ? site.whyReasons : FALLBACK_REASONS;
  const whyTitle = site?.whyTitle || "";
  const stayTrackRef = useRef<HTMLDivElement>(null);
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 1: true });
  const [activeSubnav, setActiveSubnav] = useState("overview");
  const [activeMapCity, setActiveMapCity] = useState("hanoi");
  const [showMobileMap, setShowMobileMap] = useState(false);

  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal:not(.is-visible)");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { reveals.forEach((el) => el.classList.add("is-visible")); }
    else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); } });
      }, { threshold: 0.12 });
      reveals.forEach((el) => io.observe(el));
    }

    // Scroll spy for Itinerary map
    const dayElements = document.querySelectorAll(".itin-day");
    const dayIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const city = entry.target.getAttribute("data-city");
          if (city) setActiveMapCity(city);
        }
      });
    }, { rootMargin: "-40% 0px -40% 0px" });
    dayElements.forEach(el => dayIo.observe(el));

    return () => {
      // Cleanup observers
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 140;
      const sections = ["overview", "itinerary", "stays", "inclusions"].map(id => document.getElementById(id));
      let current = "overview";
      sections.forEach(sec => { if (sec && sec.offsetTop <= pos) current = sec.id; });
      setActiveSubnav(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDay = (id: number) => {
    setOpenDays(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const acf = (tourData?.acf || {}) as Record<string, unknown>;

  const lines = (value: unknown) =>
    (typeof value === "string" ? value : "").split("\n").map((line) => line.trim()).filter(Boolean);
  const rows = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

  /* No invented content: a tour without data hides that section rather than
     borrowing another tour's itinerary, stays or prices. */
  const highlights = lines(acf.highlights_list);
  const inclusions = lines(acf.inclusions_list);
  const exclusions = lines(acf.exclusions_list);

  /* WordPress stores the itinerary flat, one row per day, tagged with its region. */
  const itineraryRows = rows<ItineraryRow>(acf.itinerary);
  const itineraryGroups = itineraryRows.reduce<
    Array<{ region: string; days: Array<{ id: number; title: string; desc: string; image?: string }> }>
  >((groups, row, index) => {
    const region = (row.group_tag || "Itinerary").trim();
    const last = groups[groups.length - 1];
    const day = {
      id: index + 1,
      title: row.title || `Day ${row.day_num || index + 1}`,
      desc: row.description || "",
      image: row.image_url,
    };
    if (last && last.region === region) last.days.push(day);
    else groups.push({ region, days: [day] });
    return groups;
  }, []);

  /* The map takes real coordinates when the import supplied them, names otherwise. */
  const mapStops = Array.from(
    itineraryRows
      .reduce((byRegion, row) => {
        const label = (row.group_tag || "").trim();
        if (!label || byRegion.has(label)) return byRegion;
        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        byRegion.set(label, {
          key: label.toLowerCase().replace(/[^a-z0-9]/g, ""),
          label,
          ...(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : {}),
        });
        return byRegion;
      }, new Map<string, { key: string; label: string; lat?: number; lng?: number }>())
      .values(),
  );

  /* An editor's picks win. Where there are none - most imported journeys carry
     no hotel list - the country's own stays fill the strip rather than leaving
     a heading with nothing under it. */
  const stays = (
    tourData?.related?.featured_stays?.length
      ? tourData.related.featured_stays
      : nearbyStays
  ).map((hotel) => ({
    name: hotel.title,
    desc: hotel.excerpt || ("categories" in hotel ? hotel.categories?.[0]?.name : "") || "",
    image: hotel.featuredMedia?.url,
    /* Carried through so the card can be a link - it was a dead <div>. */
    path: hotel.path,
  }));

  const dates = rows<DepartureRow>(acf.departure_dates).map((row) => ({
    range: row.date_range || "",
    price: row.price_info || "",
    open: (row.availability_status || "Available") !== "Sold Out",
  }));

  const gallery = rows<GalleryRow>(acf.gallery).filter((row) => row.image_url);
  const faqs = rows<FaqRow>(acf.faqs).filter((row) => row.question);

  const title = typeof tourData?.title === "string" && tourData.title ? tourData.title : "Private Journey";
  const heroImage = tourData?.featuredMedia?.url || text(acf.hero_image);
  const duration = text(acf.duration_days) || (itineraryRows.length ? String(itineraryRows.length) : "");
  const destCount = text(acf.destinations_count) || (mapStops.length ? String(mapStops.length) : "");
  const minGuests = text(acf.min_guests);
  const durationLabel = text(acf.duration_label);
  const offerText = text(acf.special_offer_text);

  /* Subnav only advertises sections that actually rendered. */
  const navItems = [
    { id: "overview", label: "Overview", show: true },
    { id: "itinerary", label: "Itinerary", show: itineraryGroups.length > 0 },
    { id: "stays", label: "Stays", show: stays.length > 0 },
    { id: "inclusions", label: "Inclusions", show: inclusions.length > 0 || dates.length > 0 },
  ].filter((item) => item.show);
  const country = tourData?.terms?.find((term) => term.taxonomy === "country" || term.taxonomy === "category");

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2C10.5 20 4 13.5 4 5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></symbol>
          <symbol id="i-menu" viewBox="0 0 24 24"><line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.5"/></symbol>
          <symbol id="i-close" viewBox="0 0 24 24"><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.5"/></symbol>
          <symbol id="i-arrow" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5"/><polyline points="14,6 20,12 14,18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
          <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></symbol>
          <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
          <symbol id="i-chat" viewBox="0 0 48 48"><path d="M8 12h32v20H20l-8 8V32H8Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></symbol>
          <symbol id="i-guide" viewBox="0 0 48 48"><circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M10 40c2-9 8-13 14-13s12 4 14 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
          <symbol id="i-car" viewBox="0 0 48 48"><path d="M8 30 L11 20 Q13 16 18 16 H30 Q35 16 37 20 L40 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><rect x="6" y="30" width="36" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="14" cy="38" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="34" cy="38" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/></symbol>
          <symbol id="i-key" viewBox="0 0 48 48"><circle cx="16" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M23 24 H41 M35 24 V30 M41 24 V30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
          <symbol id="i-gem" viewBox="0 0 48 48"><path d="M12 10h24l8 10-20 18-20-18Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 10 24 28 36 10 M4 20h40" fill="none" stroke="currentColor" strokeWidth="1.2"/></symbol>
          <symbol id="i-clock" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M24 14v10l8 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
          <symbol id="i-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
          <symbol id="i-chevron" viewBox="0 0 24 24"><polyline points="9,5 16,12 9,19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        </defs>
      </svg>
      {/* ═══ HERO PHOTO ═══ */}
      <section id="hero" className={`hero-photo ph ${heroImage ? '' : 'ph-vn'}`} style={{ minHeight: "60vh", backgroundImage: heroImage ? `url(${optimized(heroImage, "hero")})` : undefined }}>
        <div className="overlay-bottom"></div>
        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            {text(acf.hero_eyebrow) ? (
              <span className="hero-tag" dangerouslySetInnerHTML={{ __html: text(acf.hero_eyebrow) }} />
            ) : (
              <>
                <span className="hero-tag">Tailor-Made</span>
                <span className="hero-tag">Offer</span>
              </>
            )}
          </div>
          <h1 style={{ color: "var(--white)", fontSize: "clamp(2rem,4.4vw,3.4rem)", maxWidth: "16ch" }}>{title}</h1>
        </div>
      </section>

      {/* ═══ STATS BAND ═══ */}
      <div className="stats-band">
        <div className="container stats-inner">
          <div className="stat-block" data-preview="duration_days" style={{ display: duration ? "" : "none" }}><div className="num">{duration}</div><div className="label">Days</div></div>
          <div className="stat-block" data-preview="duration_label" style={{ display: !duration && durationLabel ? "" : "none" }}><div className="num" style={{ fontSize: "1.4rem" }}>{durationLabel}</div><div className="label">Duration</div></div>
          <div className="stat-block" data-preview="destinations_count" style={{ display: destCount ? "" : "none" }}><div className="num">{destCount}</div><div className="label">Destinations</div></div>
          <div className="stat-block" data-preview="min_guests" style={{ display: minGuests ? "" : "none" }}><div className="num">{minGuests}</div><div className="label">Guests Minimum</div></div>
        </div>
      </div>

      {/* ═══ TOUR SUBNAV ═══ */}
      <nav className="tour-subnav" id="tourSubnav">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", background: "none", border: "none", cursor: "pointer", color: "var(--ink)", paddingBottom: "0.3rem" }}>
            Back to Top <svg style={{ width: "16px", height: "16px", transform: "rotate(-90deg)" }}><use href="#i-arrow"></use></svg>
          </button>
          
          <div className="tour-subnav-inner" style={{ flex: 1, justifyContent: "center" }}>
            {navItems.map((item) => (
              <Link key={item.id} href={`#${item.id}`} className={activeSubnav === item.id ? "is-active" : ""}>
                {item.label}
              </Link>
            ))}
          </div>
          
          <div style={{ width: "100px" }}></div> {/* spacer for centering */}
        </div>
      </nav>

      {/* ═══ OVERVIEW ═══ */}
      <section className="section on-white" id="overview">
        <div className="container">
          <p className="crumb" style={{ marginBottom: "1.6rem" }}>
            <Link href="/">{BRAND_SHORT}</Link><span>/</span>
            {country && (
              <>
                <Link href={country.path || "/tours/"}>{country.name}</Link><span>/</span>
              </>
            )}
            <span className="current">{title}</span>
          </p>

          <div className="overview-lede reveal">
            <span className="tag">Overview</span>
            {tourData?.content ? (
              <div className="wordpress-content" dangerouslySetInnerHTML={{ __html: tourData.content }} />
            ) : (
              <p>A single thread from north to south: Halong Bay by private junk, Hue's imperial tombs, and Saigon after dark. Forward-looking cities give way to rice terraces and quiet fishing villages, with a private guide and driver throughout.</p>
            )}
          </div>

          {highlights.length > 0 && (
            <div className="reveal" style={{ marginTop: "2.4rem" }}>
              {/* WordPress carries its own wording for this block; the template
                  printed a fixed heading over it. */}
              <p className="eyebrow">
                {text(acf.intro_title) ? (
                  <span dangerouslySetInnerHTML={{ __html: text(acf.intro_title) }} />
                ) : (
                  <><em>About This</em> Journey</>
                )}
              </p>
              <p className="headline">
                {text(acf.highlights_title) || <><em>Trip</em> Highlights</>}
              </p>
              <div className="inclusion-list">
                {highlights.map((item, idx) => (
                  <div className="inclusion-item" key={idx}>
                    <CheckSvg />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
              {text(acf.highlights_note) && (
                <p className="tour-note">{text(acf.highlights_note)}</p>
              )}
            </div>
          )}

          <div className="center reveal" style={{ marginTop: "4rem" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>{whyTitle || (text(acf.why_title) ? <span dangerouslySetInnerHTML={{ __html: text(acf.why_title) }} /> : <><em>Why Choose</em> {BRAND_SHORT}</>)}</p>
          </div>
          <div className="why-grid reveal">
            {reasons.map((reason, idx) => (
              <div className="why-item" key={idx}>
                <svg><use href={`#i-${reason.icon || "gem"}`}></use></svg>
                <p>{reason.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section className="section on-cream" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-banner reveal">
            <div>
              <h3>Interested in this itinerary but want to join a small group instead?</h3>
              <p>Our small group departures follow a similar route at a lower per-person cost.</p>
            </div>
            <Link href="/vietnam-tours/" className="link-arrow">Learn More<ArrowSvg/></Link>
          </div>
        </div>
      </section>

      {/* ═══ ITINERARY ═══ */}
      {itineraryGroups.length > 0 && (
      <section className="section on-white" id="itinerary">
        <div className="container">
          <div className="center reveal">
            <p className="eyebrow" style={{ justifyContent: "center" }}>{text(acf.itinerary_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acf.itinerary_eyebrow) }} /> : <><em>Day</em> by Day</>}</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.4rem)" }}>{text(acf.itinerary_title) || "Itinerary"}</h2>
          </div>

          <div className="itinerary-split reveal" style={{ marginTop: "2.4rem" }}>
            {/* Desktop map column */}
            <div className="itinerary-map-col">
              <div className="sticky-map-wrapper" style={{ position: "sticky", top: "80px", height: "calc(100vh - 120px)", minHeight: "400px", paddingBottom: "20px" }}>
                <RealMapComponent
                  stopsList={mapStops}
                  activeCity={activeMapCity}
                  setActiveCity={setActiveMapCity}
                />
              </div>
            </div>
            
            <div className="itinerary-days-col">
              {itineraryGroups.map((group, gIdx) => (
                <div key={gIdx} className="itin-group-wrapper">
                  <span className="itin-group-tag">{group.region}</span>
                  {group.days.map((day) => {
                    const isOpen = !!openDays[day.id];
                    const cityKey = group.region.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const image = "image" in day ? (day as { image?: string }).image : undefined;
                    return (
                      <div key={day.id} className={`itin-day ${isOpen ? "is-open" : ""}`} data-city={cityKey}>
                        <button className="itin-day-head" onClick={() => toggleDay(day.id)}>
                          {day.title}
                          <ChevronSvg />
                        </button>
                        <div className="itin-day-body" style={{ maxHeight: isOpen ? "1200px" : "0" }}>
                          {image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={optimized(image, "card")} alt={day.title} loading="lazy" style={{ width: "100%", borderRadius: "3px", marginBottom: "1rem" }} />
                          )}
                          <p>{day.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Floating "View Map" button on Mobile */}
          <button
            className={`mobile-map-toggle-btn ${showMobileMap ? "hidden" : ""}`}
            onClick={() => setShowMobileMap(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            View Map
          </button>

          {/* Mobile Map Full-screen Overlay */}
          <div className={`mobile-map-overlay ${showMobileMap ? "open" : ""}`}>
            <div className="mobile-map-overlay-head">
              <span className="mobile-map-overlay-title">Tour Map & Route</span>
              <button className="mobile-map-overlay-close" onClick={() => setShowMobileMap(false)} aria-label="Close Map">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="mobile-map-overlay-body">
              <RealMapComponent
                stopsList={mapStops}
                activeCity={activeMapCity}
                setActiveCity={setActiveMapCity}
              />
            </div>
          </div>

          {inclusions.length > 0 && (
            <div className="center reveal" style={{ marginTop: "3rem" }}>
              <Link href="#inclusions" className="btn btn-fill-ink">View Inclusions</Link>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ═══ STAYS ═══ */}
      {stays.length > 0 && (
        <section className="section on-cream" id="stays">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow" style={{ justifyContent: "center" }}>{text(acf.hotels_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acf.hotels_eyebrow) }} /> : <><em>Where</em> You&apos;ll Stay</>}</p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{text(acf.hotels_title).split("\n")[0] || "Hand-Selected for an Unmatched Stay"}</h2>
            </div>
            <div className="hcarousel-track reveal" id="stayTrack" ref={stayTrackRef} style={{ justifyContent: "center" }}>
              {stays.map((stay, idx) => (
                <Link
                  href={stay.path || "/where-to-stay/"}
                  className={`hc-card ph ${stay.image ? "" : "ph-vn"}`}
                  style={{ aspectRatio: "3/4.4", ...(bg(stay.image, "card") || {}) }}
                  key={idx}
                >
                  <div className="overlay-bottom"></div>
                  <h3>{stay.name}</h3>
                  {/* Unclamped, these ran the height of the card and buried the
                      photograph underneath the text. */}
                  <p>{clampText(stay.desc, 110)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ INCLUSIONS ═══ */}
      {(inclusions.length > 0 || exclusions.length > 0 || dates.length > 0 || offerText) && (
      <section className="section on-cream" id="inclusions">
        <div className="container">
          <div className="center reveal">
            <p className="eyebrow" style={{ justifyContent: "center" }}>{text(acf.inclusions_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acf.inclusions_eyebrow) }} /> : <><em>Inclusions</em> &amp; Offers</>}</p>
            <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{text(acf.inclusions_title) || "What's Included"}</h2>
          </div>

          {offerText && (
            <div className="offer-callout reveal">
              <SparkleSvg />
              <div>
                <p className="tag">Offer</p>
                <p className="body">{offerText}</p>
                <Link href="/#plan">Learn more</Link>
              </div>
            </div>
          )}

          <div className="inclusion-list reveal">
            {inclusions.map((inc: string, idx: number) => (
              <div className="inclusion-item" key={idx}>
                <CheckSvg />
                <p>{inc}</p>
              </div>
            ))}
          </div>

          {exclusions.length > 0 && (
            <>
              <h3 className="center reveal" style={{ marginTop: "3rem", fontSize: "1.3rem" }}>{text(acf.exclusions_title) || "What's Not Included"}</h3>
              <div className="inclusion-list reveal">
                {exclusions.map((item, idx) => (
                  <div className="inclusion-item" key={idx}>
                    <p style={{ opacity: 0.75 }}>{item}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {dates.length > 0 && (
            <div className="reveal" style={{ marginTop: "3rem" }}>
              <h3 className="center" style={{ fontSize: "1.3rem", marginBottom: "1.2rem" }}>{text(acf.dates_title) || "Departure Dates"}</h3>
              <div className="inclusion-list">
                {dates.map((date, idx) => (
                  <div className="inclusion-item" key={idx} style={{ justifyContent: "space-between", gap: "1rem" }}>
                    <p><strong>{date.range}</strong> — {date.price}</p>
                    <span style={{ fontSize: "0.8rem", color: date.open ? "var(--rust)" : "var(--text-dim-on-cream)" }}>
                      {date.open ? "Available" : "Sold Out"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="center reveal" style={{ marginTop: "2.6rem" }}>
            <Link href="/#plan" className="btn btn-fill-ink">Request This Itinerary</Link>
          </div>
        </div>
      </section>
      )}

      {gallery.length > 0 && (
        <section className="section on-white" id="gallery">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow" style={{ justifyContent: "center" }}>{text(acf.gallery_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acf.gallery_eyebrow) }} /> : <><em>Photo</em> Gallery</>}</p>
            </div>
            <div className="hcarousel-track reveal">
              {gallery.map((item, idx) => (
                <div
                  className="hc-card ph"
                  key={idx}
                  style={{ aspectRatio: "3/4.4", ...(bg(item.image_url, "card") || {}) }}
                >
                  <div className="overlay-bottom"></div>
                  {item.caption && <h3>{item.caption}</h3>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="section on-cream" id="faqs">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow" style={{ justifyContent: "center" }}>{text(acf.faq_eyebrow) ? <span dangerouslySetInnerHTML={{ __html: text(acf.faq_eyebrow) }} /> : <><em>Good</em> to Know</>}</p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{text(acf.faq_title) || "Frequently Asked Questions"}</h2>
            </div>
            <div className="reveal" style={{ maxWidth: "780px", margin: "2rem auto 0" }}>
              {faqs.map((faq, idx) => (
                <details key={idx} className="itin-day" style={{ padding: "1rem 0" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>{faq.question}</summary>
                  <p style={{ marginTop: "0.6rem" }}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
