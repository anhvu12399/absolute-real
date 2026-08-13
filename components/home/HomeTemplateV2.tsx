"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContentRecord } from "@/lib/types";
import type { ArchiveItem } from "@/lib/wp";
import dynamic from "next/dynamic";
import { toLocalHref } from "@/lib/links";
import { BRAND_SHORT } from "@/lib/site";
import { bg, optimized } from "@/lib/images";

/* Leaflet touches `window` on import, so it only ever loads in the browser. */
const RealMapComponent = dynamic(() => import("../destination/RealMapComponent"), { ssr: false });

/* The route the section describes, in the order it is travelled. Real
   coordinates - RealMapComponent resolves these keys itself. */
const MAP_COUNTRIES = ["Bhutan", "Laos", "Vietnam", "Cambodia", "Thailand", "Indonesia"];

/* ============================================================
   V2 Home Template — "Composed For You"
   ============================================================ */

function ArrowSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7,7 17,7 17,17"/></svg>;
}

export default function HomeTemplateV2({
  homeData,
  tours = [],
  places = [],
  hotels = [],
}: {
  homeData?: ContentRecord | null;
  /** Live WordPress content used whenever the matching homepage cards are empty. */
  tours?: ArchiveItem[];
  places?: ArchiveItem[];
  hotels?: ArchiveItem[];
}) {
  const acf = homeData?.acf || {};

  // Parse repeater data safely
  const safeParse = (data: any) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string' && data.startsWith('[')) {
      try { return JSON.parse(data); } catch(e) { return []; }
    }
    return [];
  };

  /* WordPress auto-excerpts repeat the post title as their first words. */
  const blurb = (item: ArchiveItem) => {
    const excerpt = item.excerpt || "";
    return excerpt.startsWith(item.title) ? excerpt.slice(item.title.length).trim() : excerpt;
  };

  /* Archive items and hand-authored cards render through the same card shape. */
  const toCard = (item: ArchiveItem) => ({
    image_url: item.featuredMedia?.url || "",
    badge: item.categories?.[0]?.name || "",
    title: item.title,
    meta: item.duration || "",
    description: blurb(item),
    link: item.path,
    link_text: "Explore",
    ph: "",
  });

  /* Photographs available to lend, newest first. */
  const photoPool = [...tours, ...places, ...hotels]
    .map((item) => item.featuredMedia?.url)
    .filter((url): url is string => Boolean(url));

  const cards = (value: unknown, fallback: ArchiveItem[]) => {
    const authored = safeParse(value);
    if (!authored.length) return fallback.map(toCard);
    /* An authored card with no image of its own borrows a real photograph
       rather than leaving a blank tile in the grid. */
    let borrowed = 0;
    return authored.map((card: any) => ({
      ...card,
      image_url: card.image_url || photoPool[borrowed++ % Math.max(photoPool.length, 1)] || "",
    }));
  };

  /* Card blurbs are auto-excerpts from WordPress and run long. */
  const clamp = (value: unknown, max = 120) => {
    const text = String(value || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim();
    return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
  };

  const destinations = cards(acf.home_tab_destinations, places);
  const journeys = cards(acf.home_tab_journeys, tours);
  const offers = cards(acf.home_tab_offers, tours.slice(3));
  const newItems = cards(acf.home_tab_new, tours.slice(0, 3));

  /* Two authored cards in a carousel look like a loading failure. Real places
     top the row up to six without replacing what an editor chose. */
  const authoredWays = cards(acf.home_ways_to_explore, []);
  const waysToExplore = authoredWays.length >= 4
    ? authoredWays
    : [...authoredWays, ...places.filter((p) => !authoredWays.some((c: any) => c.title === p.title)).map(toCard)].slice(0, 6);
  const stayWith = cards(acf.home_stay_with, hotels.slice(0, 4));
  const waysToTravel = cards(acf.home_ways_to_travel, tours.slice(0, 5));

  /* Hero: the WordPress slider drives it; live tours stand in until it is filled. */
  const authoredSlides = safeParse(acf.home_banner_slider);
  const fallbackSource = (tours.length ? tours : places).slice(0, 4);
  const slides: any[] = authoredSlides.length
    ? authoredSlides
    : fallbackSource.map((item, idx) => ({
        image_url: item.featuredMedia?.url,
        // The inset frame shows the next journey in the rotation.
        image_url_2: fallbackSource[(idx + 1) % fallbackSource.length]?.featuredMedia?.url,
        tagline: "Travel",
        title: "Inspiration",
        description: item.title,
        subtitle: clamp(blurb(item), 150),
        meta: fallbackSource[(idx + 1) % fallbackSource.length]?.title || item.categories?.[0]?.name || "",
        meta_plate: fallbackSource[(idx + 1) % fallbackSource.length]?.categories?.[0]?.name || "Next Journey",
        link: item.path,
        link_text: "Explore This Journey",
      }));

  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((i) => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const hero = slides[heroIndex] || slides[0] || {};
  /* The legacy slider has no second image, so the inset frame previews the next
     slide instead of sitting empty. */
  const nextSlide = slides.length > 1 ? slides[(heroIndex + 1) % slides.length] : null;
  const insetImage = hero.image_url_2 || nextSlide?.image_url || "";
  const insetCaption = hero.meta || nextSlide?.description || "Mekong Delta";
  const insetPlate = hero.meta_plate || (nextSlide ? "Next" : hero.tagline || BRAND_SHORT);
  const coreValues = safeParse(acf.home_values);
  const testimonials = safeParse(acf.testimonials);
  const reviewSummary = typeof acf.review_summary === "string" ? acf.review_summary : "";
  const reviewLogo = typeof acf.review_logo === "string" ? acf.review_logo : "";
  const reviewLink = typeof acf.review_link === "string" ? acf.review_link : "";
  const reviewText = typeof acf.review_text === "string" ? acf.review_text : "";
  const responsiblyText = typeof acf.responsibly_text === "string" ? acf.responsibly_text.trim() : "";
  /* This panel is half the viewport wide and full-bleed tall, so on a retina
     screen it needs roughly 2000 device pixels. Taking the first available
     photograph handed it a 1200px file blown up to twice its size - soft and
     obviously wrong beside crisp type. Pick the largest one instead. */
  const widestPhoto = (items: ArchiveItem[]) =>
    items
      .filter((item) => item.featuredMedia?.url)
      .sort((a, b) => (b.featuredMedia?.width || 0) - (a.featuredMedia?.width || 0))[0]?.featuredMedia;

  const responsiblyImage =
    (typeof acf.responsibly_image === "string" ? acf.responsibly_image.trim() : "") ||
    /* A place photograph suits this panel better than a hotel interior. */
    widestPhoto(places)?.url ||
    widestPhoto([...tours, ...hotels])?.url ||
    "";

  /* --- reveal init --- */
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal:not(.is-visible)");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { reveals.forEach((el) => el.classList.add("is-visible")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* --- tabs --- */
  const [activeTab, setActiveTab] = useState("dest");
  /* Three at a time. The grid used to drop every card at once, which made the
     section taller than the rest of the page put together. */
  const STEP = 3;
  const [shown, setShown] = useState<Record<string, number>>({});
  const visible = (key: string) => shown[key] ?? STEP;
  const showMore = (key: string) => setShown((prev) => ({ ...prev, [key]: visible(key) + STEP }));

  /* --- trip carousel --- */
  const tripTrackRef = useRef<HTMLDivElement>(null);

  /* --- map pills --- */
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  /* --- form chips --- */
  const [chips, setChips] = useState<Record<string, boolean>>({});
  const toggleChip = (name: string) => setChips((prev) => ({ ...prev, [name]: !prev[name] }));

  /* --- form submit --- */
  const [formSent, setFormSent] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setFormSent(true); };

  /* Labels come from WordPress; the fallbacks are what shipped. */
  const label = (key: string, fallback: string) =>
    (typeof acf[key] === "string" && (acf[key] as string).trim()) || fallback;

  const tabs = [
    { key: "dest", label: label("tab_1_label", "Where to Go") },
    { key: "journeys", label: label("tab_2_label", "Journeys to Book") },
    { key: "offers", label: label("tab_3_label", "Special Offers") },
    { key: "new", label: label("tab_4_label", "New This Season") },
  ];

  return (
    <>
      {/* ═══ KIỂU 2: PANORAMA HORIZON & DESTINATION STRIP HERO ═══ */}
      <section id="hero" className={`dest-strip-hero ph ${hero.image_url ? '' : 'ph-hero'}`} style={hero.image_url ? bg(hero.image_url, "hero") : {}}>
        <div className="dest-strip-cinema-overlay"></div>

        <div className="container dest-strip-content-wrap">
          <div className="dest-strip-copy">
            <div className="dest-strip-eyebrow">
              <span className="dest-strip-eyebrow-line"></span>
              <span className="dest-strip-eyebrow-text">
                <em>{String(hero.tagline || "Private Bespoke")}</em> {String(hero.title || "Journeys")}
              </span>
            </div>

            <h1
              className="dest-strip-headline"
              dangerouslySetInnerHTML={{ __html: String(hero.description || "Vietnam: The <em>Slow Gold</em> of the Mekong at Dawn") }}
            />

            {hero.subtitle && (
              <p className="dest-strip-subtitle">{String(hero.subtitle)}</p>
            )}

            <div className="dest-strip-actions">
              <Link href={toLocalHref(hero.link, "#plan")} className="btn btn-line-white">
                <span>{String(hero.link_text || "Explore This Journey")}</span>
                <ArrowSvg />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Destination Tabs Strip */}
        {slides.length > 1 && (
          <div className="dest-strip-bar">
            <div className="container dest-strip-bar-inner">
              <div className="dest-strip-tabs">
                {slides.map((s, idx) => {
                  const isActive = idx === heroIndex;
                  const rawTitle = String(s.description || s.title || `Journey ${idx + 1}`).replace(/<[^>]+>/g, "");
                  const countryName = rawTitle.split(/[:|–—]/)[0].trim();
                  const shortSub = rawTitle.split(/[:|–—]/)[1]?.trim() || s.tagline || "Private Expedition";
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`dest-strip-tab${isActive ? " is-active" : ""}`}
                      onClick={() => setHeroIndex(idx)}
                    >
                      <div className="dest-tab-top-line"></div>
                      <div className="dest-tab-header">
                        <span className="dest-tab-num">{String(idx + 1).padStart(2, "0")}</span>
                        <span className="dest-tab-country">{countryName}</span>
                      </div>
                      <span className="dest-tab-sub">{clamp(shortSub, 32)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══ STATEMENT + STATS ═══ */}
      <section id="statement" className="section on-cream" style={{ paddingTop: "clamp(2.2rem, 3.8vw, 3.2rem)", paddingBottom: 0 }}>
        {/* A div, not a p: the WordPress statement carries block tags, and the
            browser would close a <p> around them and break hydration. */}
        <div className="statement center reveal" dangerouslySetInnerHTML={{ __html: String(acf.statement_text || "For more than twenty years, we have been turning a single idea for a trip into an itinerary that could belong to no one else. A journey through Asia should never feel arranged — it should feel like it was always <em>composed, not booked.</em>") }}></div>
        <div className="stat-row reveal">
          <div className="stat-item"><div className="stat-num">{String(acf.stat_1_num || "20")}</div><div className="stat-label">{String(acf.stat_1_label || "Years in Asia")}</div></div>
          <div className="stat-item"><div className="stat-num">{String(acf.stat_2_num || "6")}</div><div className="stat-label">{String(acf.stat_2_label || "Countries, One Itinerary")}</div></div>
          <div className="stat-item"><div className="stat-num">{String(acf.stat_3_num || "24")}</div><div className="stat-label">{String(acf.stat_3_label || "Hour Concierge")}</div></div>
        </div>
        <div style={{ height: "clamp(1.5rem, 2.8vw, 2.4rem)" }}></div>
      </section>

      {/* ═══ TABBED JOURNEY CARDS ═══ */}
      <section className="section on-white" id="journeys">
        <div className="container">
          <h2 className="center reveal" style={{ fontSize: "clamp(1.8rem,3.2vw,2.4rem)" }} dangerouslySetInnerHTML={{ __html: String(acf.tabs_headline || "Where do you want to <em>go</em>?") }}></h2>
          <div className="tabs-row reveal" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} className={`tab-btn${activeTab === t.key ? " is-active" : ""}`} role="tab" aria-selected={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className={`tab-panel${activeTab === "dest" ? " is-active" : ""} reveal`} data-panel="dest">
            <div className="card-grid">
              {destinations.slice(0, visible("dest")).map((card: any, idx: number) => (
                <OfferCard key={idx} badge={String(card.badge || "")} title={String(card.title || "")} desc={clamp(card.description, 150)} link={toLocalHref(card.link, "#plan")} linkText={String(card.link_text || "")} ph={String(card.ph || "")} imageUrl={card.image_url} />
              ))}
            </div>
            {destinations.length > visible("dest") && (
              <div className="center" style={{ marginTop: "1.8rem" }}>
                <button type="button" className="btn btn-line-ink" onClick={() => showMore("dest")}>
                  Load more
                </button>
              </div>
            )}
          </div>
          <div className={`tab-panel${activeTab === "journeys" ? " is-active" : ""} reveal`} data-panel="journeys">
            <div className="card-grid">
              {journeys.slice(0, visible("journeys")).map((card: any, idx: number) => (
                <OfferCard key={idx} badge={String(card.badge || "")} title={String(card.title || "")} meta={String(card.meta || "")} desc={clamp(card.description, 150)} link={toLocalHref(card.link, "#plan")} linkText={String(card.link_text || "")} ph={String(card.ph || "")} imageUrl={card.image_url} />
              ))}
            </div>
            {journeys.length > visible("journeys") && (
              <div className="center" style={{ marginTop: "1.8rem" }}>
                <button type="button" className="btn btn-line-ink" onClick={() => showMore("journeys")}>
                  Load more
                </button>
              </div>
            )}
          </div>
          <div className={`tab-panel${activeTab === "offers" ? " is-active" : ""} reveal`} data-panel="offers">
            <div className="card-grid">
              {offers.slice(0, visible("offers")).map((card: any, idx: number) => (
                <OfferCard key={idx} badge={String(card.badge || "")} title={String(card.title || "")} desc={clamp(card.description, 150)} link={toLocalHref(card.link, "#plan")} linkText={String(card.link_text || "")} ph={String(card.ph || "")} imageUrl={card.image_url} />
              ))}
            </div>
            {offers.length > visible("offers") && (
              <div className="center" style={{ marginTop: "1.8rem" }}>
                <button type="button" className="btn btn-line-ink" onClick={() => showMore("offers")}>
                  Load more
                </button>
              </div>
            )}
          </div>
          <div className={`tab-panel${activeTab === "new" ? " is-active" : ""} reveal`} data-panel="new">
            <div className="card-grid">
              {newItems.slice(0, visible("new")).map((card: any, idx: number) => (
                <OfferCard key={idx} badge={String(card.badge || "")} title={String(card.title || "")} desc={clamp(card.description, 150)} link={toLocalHref(card.link, "#plan")} linkText={String(card.link_text || "")} ph={String(card.ph || "")} imageUrl={card.image_url} />
              ))}
            </div>
            {newItems.length > visible("new") && (
              <div className="center" style={{ marginTop: "1.8rem" }}>
                <button type="button" className="btn btn-line-ink" onClick={() => showMore("new")}>
                  Load more
                </button>
              </div>
            )}
          </div>

          <div className="center reveal" style={{ marginTop: "3rem" }}><Link href="#plan" className="btn btn-fill-ink">View All Journeys</Link></div>
        </div>
      </section>

      {/* ═══ WAYS TO EXPLORE CAROUSEL ═══ */}
      <section id="explore" className="section on-cream">
        <div className="container">
          <div className="hcarousel-head reveal">
            <div>
              <p className="eyebrow"><em dangerouslySetInnerHTML={{ __html: String(acf.explore_eyebrow || "<em>Ways</em> to Explore") }}></em></p>
              <h2 style={{ fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }} dangerouslySetInnerHTML={{ __html: String(acf.explore_headline || "What kind of <em>trip</em> are you looking for?") }}></h2>
            </div>
            <div className="hcarousel-arrows">
              <button className="hc-btn" aria-label="Previous" onClick={() => tripTrackRef.current?.scrollBy({ left: -320, behavior: "smooth" })}><svg style={{ transform: "rotate(180deg)" }}><use href="#i-arrow"></use></svg></button>
              <button className="hc-btn" aria-label="Next" onClick={() => tripTrackRef.current?.scrollBy({ left: 320, behavior: "smooth" })}><svg><use href="#i-arrow"></use></svg></button>
            </div>
          </div>
          <div className="hcarousel-track reveal" ref={tripTrackRef}>
            {waysToExplore.map((item: any, idx: number) => (
              <Link
                href={toLocalHref(item.link, "#plan")}
                className={`hc-card ph ${item.image_url ? "" : item.ph || "ph-th"}`}
                style={item.image_url ? bg(item.image_url, "card") : {}}
                key={idx}
              >
                <div className="overlay-bottom"></div>
                <h3>{String(item.title || "")}</h3>
                <p>{clamp(item.description)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STAY WITH ═══ */}
      <section className="section on-white" id="stay">
        <div className="container">
          <div className="center reveal">
            <p className="eyebrow"><em dangerouslySetInnerHTML={{ __html: String(acf.stay_eyebrow || `<em>Stay</em> With ${BRAND_SHORT}`) }}></em></p>
            <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }} dangerouslySetInnerHTML={{ __html: String(acf.stay_headline || "Addresses chosen for <em>character</em>, not chain") }}></h2>
          </div>
          {/* Editorial layout: one lead address, the rest as a numbered index —
              and a hotel with no photograph still reads as a plate, not a hole. */}
          <div className="stay-editorial reveal">
            {stayWith.slice(0, 1).map((item: any, idx: number) => (
              <Link
                href={toLocalHref(item.link, "#plan")}
                key={idx}
                className={`stay-lead ${item.image_url ? "has-photo" : ""}`}
                style={item.image_url ? bg(item.image_url, "panel") : undefined}
              >
                <div className="overlay-bottom"></div>
                <div className="stay-lead-copy">
                  <span className="stay-plate">Address No. 01</span>
                  <h3>{String(item.title || "")}</h3>
                  <p>{clamp(item.description, 150)}</p>
                  <span className="link-arrow">{String(item.link_text || "Discover")}<ArrowSvg /></span>
                </div>
              </Link>
            ))}

            <ol className="stay-index">
              {stayWith.slice(1, 5).map((item: any, idx: number) => (
                <li key={idx}>
                  <Link href={toLocalHref(item.link, "#plan")}>
                    <span className="stay-index-num">{String(idx + 2).padStart(2, "0")}</span>
                    <span
                      className={`stay-index-thumb ${item.image_url ? "" : "is-empty"}`}
                      style={item.image_url ? bg(item.image_url, "thumb") : undefined}
                      aria-hidden="true"
                    >
                      {!item.image_url && String(item.title || "?").trim().charAt(0)}
                    </span>
                    <span className="stay-index-copy">
                      <strong>{String(item.title || "")}</strong>
                      <em>{clamp(item.meta || item.badge || item.description, 68)}</em>
                    </span>
                    <ArrowSvg />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ═══ MAP ═══ */}
      <section id="map" className="section on-cream">
        <div className="container map-grid">
          <div className="map-copy reveal">
            <p className="eyebrow"><em>One</em> Itinerary, Six Countries</p>
            <h2 dangerouslySetInnerHTML={{ __html: String(acf.map_headline || "Your journey, <em>charted</em> by hand") }} style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}></h2>
            <p style={{ marginTop: "1.2rem" }}>{String(acf.map_description || "Cross a border without feeling the seam. Our specialists route each leg together — flights, drivers, and guides handed off quietly between countries — so a journey through the Mekong, the Himalaya, or the Indonesian archipelago reads as one continuous story.")}</p>
            <div className="pill-list">
              {["bhutan", "laos", "vietnam", "cambodia", "thailand", "indonesia"].map((c) => (
                <button key={c} className={`pill${activeCountry === c ? " is-active" : ""}`} data-country={c} onMouseEnter={() => setActiveCountry(c)} onClick={() => setActiveCountry(c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* A real map, not a drawing.
              The hand-drawn blob that used to sit here put the six countries in
              positions that matched nothing on earth - and it rendered at 16px
              anyway. This is the same Leaflet map the destination and tour pages
              use, so a route reads the same way everywhere on the site. The
              pills beside it drive the camera. */}
          <div className="map-stage reveal">
            <RealMapComponent
              stopsList={MAP_COUNTRIES}
              activeCity={activeCountry}
              setActiveCity={setActiveCountry}
            />
          </div>
        </div>
      </section>

      <section id="travel" className="section on-white">
        <div className="container">
          <div className="center reveal">
            <p className="eyebrow"><em dangerouslySetInnerHTML={{ __html: String(acf.travel_eyebrow || `<em>Ways</em> to Explore With ${BRAND_SHORT}`) }}></em></p>
            <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }} dangerouslySetInnerHTML={{ __html: String(acf.travel_headline || "How do you want to <em>travel</em>?") }}></h2>
          </div>
          <div className="ways-grid reveal">
            {waysToTravel.slice(0, 3).map((item: any, idx: number) => (
              <Link href={toLocalHref(item.link, "#plan")} className={`ways-item ph ${item.image_url ? "" : item.ph || "ph-vn"}`} style={item.image_url ? bg(item.image_url, "card") : {}} key={idx}>
                <div className="overlay-bottom"></div>
                <h3>{String(item.title || "")}</h3>
                <p>{clamp(item.description, 90)}</p>
              </Link>
            ))}
          </div>
          <div className="ways-row2 reveal">
            {waysToTravel.slice(3, 5).map((item: any, idx: number) => (
              <Link href={toLocalHref(item.link, "#plan")} className={`ways-item ph ${item.image_url ? "" : item.ph || "ph-vn"}`} style={item.image_url ? bg(item.image_url, "card") : {}} key={idx}>
                <div className="overlay-bottom"></div>
                <h3>{String(item.title || "")}</h3>
                <p>{clamp(item.description, 90)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      {testimonials.length > 0 && (
        <section className="section on-white" id="reviews">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow"><em>What</em> Travelers Say</p>
              {reviewSummary && (
                <div style={{ marginTop: "0.6rem" }} dangerouslySetInnerHTML={{ __html: reviewSummary }} />
              )}
              {reviewLink && (
                <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="link-arrow" style={{ marginTop: "0.4rem", display: "inline-flex" }}>
                  {reviewLogo && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={optimized(reviewLogo, 240)} alt={reviewText || "Review site"} style={{ height: "20px", marginRight: "8px" }} />
                  )}
                  {reviewText || "Read reviews"}
                </a>
              )}
            </div>
            <div className="card-grid reveal" style={{ marginTop: "2.4rem" }}>
              {testimonials.slice(0, 6).map((item: any, idx: number) => (
                <div className="review-card" key={idx}>
                  {item.vote && <p className="review-stars" aria-label={`${item.vote} out of 5`}>{"★".repeat(Math.min(5, Number(item.vote) || 5))}</p>}
                  <p className="review-quote">“{clamp(item.content, 260)}”</p>
                  {/* WordPress stores a photograph with every review; the card
                      printed the name alone and left it on the shelf. */}
                  <div className="review-by">
                    {item.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img className="review-avatar" src={optimized(String(item.avatar), "thumb")} alt="" loading="lazy" />
                    ) : (
                      <span className="review-avatar is-empty" aria-hidden="true">
                        {String(item.user_name || "?").trim().charAt(0)}
                      </span>
                    )}
                    <span>
                      <strong>{String(item.user_name || "")}</strong>
                      {item.date && <em>{String(item.date)}</em>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ QUOTE ═══ */}
      <section id="quote" className="quote-wrap ph ph-quote">
        <div className="overlay-full"></div>
        <div className="quote-inner reveal">
          <q>{String(acf.quote_text || "We don't plan trips. We compose, in advance, the version of Asia you didn't know you were looking for.")}</q>
          <cite>{String(acf.quote_citation || `The Founders, ${BRAND_SHORT}`)}</cite>
        </div>
      </section>

      {/* ═══ RESPONSIBLY ═══ */}
      <section id="responsibly" className="split">
        <div className="split-copy on-cream reveal">
          <p className="eyebrow"><em>Travel</em> Responsibly</p>
          <h2 dangerouslySetInnerHTML={{ __html: String(acf.responsibly_headline || `The ${BRAND_SHORT} <em>Foundation</em>`) }} style={{ fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}></h2>
          {/* An empty field used to render as a lone drop-capped "W". */}
          {responsiblyText && (
            <p>
              <span className="dropcap">{responsiblyText.charAt(0)}</span>
              {responsiblyText.slice(1)}
            </p>
          )}
          <Link href="#plan" className="btn btn-line-ink">See Our Impact</Link>
        </div>
        {/* `ph-la` is a flat CSS gradient - a placeholder that shipped. The
            photograph comes from WordPress (Travel Responsibly Photo); until
            one is set it borrows a real plate from the site's own content
            rather than showing a coloured smear. */}
        <div
          className={`split-photo ${responsiblyImage ? "" : "ph ph-la"}`}
          style={responsiblyImage ? bg(responsiblyImage, "hero") : undefined}
        />
      </section>

      {/* ═══ STORY BAR + VALUES ═══ */}
      <section id="values" className="story-bar ph ph-desert">
        <div className="overlay-full"></div>
        <div className="container story-bar-inner reveal">
          <div>
            <p className="story-tag">{String(acf.story_bar_tagline || "Private Journeys, Composed for You Since 2005")}</p>
            <h2 dangerouslySetInnerHTML={{ __html: String(acf.story_bar_headline || `The <em>${BRAND_SHORT}</em> Standard`) }}></h2>
          </div>
          <Link href="/about-us/" className="btn btn-line-white">{String(acf.story_bar_link_text || "Read Our Story")}</Link>
        </div>
      </section>
      <section className="value-grid ph ph-desert">
        <div className="container value-grid-inner reveal">
          {coreValues.map((val: any, idx: number) => (
            <div className="value-item" key={idx}><h4>{String(val.title || "")}</h4><p>{String(val.description || "")}</p></div>
          ))}
        </div>
      </section>

      {/* ═══ PLAN FORM ═══ */}
      <section className="section on-cream" id="plan">
        <div className="container plan-grid">
          <div className="plan-copy reveal">
            <p className="eyebrow"><em dangerouslySetInnerHTML={{ __html: String(acf.plan_eyebrow || "<em>Start</em> Planning") }}></em></p>
            <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }} dangerouslySetInnerHTML={{ __html: String(acf.plan_headline || "Tell us where, and we'll take it from <em>there</em>.") }}></h2>
            <p>{String(acf.plan_desc || "Share a few details and a private travel designer will reach out within one business day — no obligation, no call center.")}</p>
          </div>
          <form className="form-card reveal" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field"><label htmlFor="fname">Full name</label><input id="fname" type="text" placeholder="Jordan Whitfield" required /></div>
              <div className="field"><label htmlFor="femail">Email</label><input id="femail" type="email" placeholder="jordan@email.com" required /></div>
            </div>
            <div className="field"><label>Destination(s) of interest</label>
              <div className="chip-group">
                {["Vietnam", "Cambodia", "Laos", "Thailand", "Bhutan", "Indonesia", "Not sure yet"].map((name) => (
                  <button key={name} type="button" className="chip" aria-pressed={chips[name] ? "true" : "false"} onClick={() => toggleChip(name)}>{name}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="fdates">Approximate travel dates</label><input id="fdates" type="text" placeholder="March 2027, 2 weeks" /></div>
              <div className="field"><label htmlFor="fparty">Party size</label><input id="fparty" type="number" min={1} placeholder="2" /></div>
            </div>
            <div className="field"><label htmlFor="fmsg">Tell us about the trip you&apos;re imagining</label><textarea id="fmsg" placeholder="A honeymoon that mixes Bangkok with a quiet beach in Thailand..."></textarea></div>
            <button type="submit" className="btn btn-line-ink" style={{ marginTop: "1.6rem", width: "100%" }}>{String(acf.plan_btn || "Begin Planning My Journey")}</button>
            {formSent && <div className="form-success show">Thank you — a private travel designer will be in touch within one business day.</div>}
          </form>
        </div>
      </section>
    </>
  );
}

/* ---------- helper component ---------- */
function OfferCard({ badge, title, meta, desc, link, linkText, ph, imageUrl }: { badge: string; title: string; meta?: string; desc: string; link: string; linkText: string; ph: string; imageUrl?: string }) {
  return (
    <div className="offer-card">
      <div className={`offer-photo ph ${ph}`} style={imageUrl ? bg(imageUrl, "card") : {}}>
        {badge && <span className="tag-badge">{badge}</span>}
      </div>
      <h3>{title}</h3>
      {meta && <p className="offer-meta">{meta}</p>}
      <p className="desc">{desc}</p>
      <Link href={link} className="link-arrow">{linkText}<ArrowSvg/></Link>
    </div>
  );
}
