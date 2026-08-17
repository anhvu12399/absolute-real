"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ContentRecord } from "@/lib/types";
import type { ArchiveItem, TermInfo } from "@/lib/wp";
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
  countries = [],
  cruises = [],
  guides = [],
}: {
  homeData?: ContentRecord | null;
  /** Live WordPress content used whenever the matching homepage cards are empty. */
  tours?: ArchiveItem[];
  places?: ArchiveItem[];
  hotels?: ArchiveItem[];
  /** The country taxonomy — what "where to go" actually means. */
  countries?: TermInfo[];
  /** Cruise content, filed under the asia-cruises category on the legacy site. */
  cruises?: ArchiveItem[];
  /** Editorial: guides and stories. */
  guides?: ArchiveItem[];
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

  /**
   * A tab shows what its label promises, and links on to the full set.
   *
   * The legacy import filled these four fields one-for-one, but their meaning
   * did not survive the move: "where to go" arrived holding trip *types*
   * ("Cycling Tours"), and "journeys to book" arrived holding blog posts. So
   * each tab states the kind of link that belongs in it — authored rows that
   * fit are kept and win, rows that do not step aside for live content of the
   * right kind.
   *
   * Six at a time, then "view all". A row the eye takes in at once beats a
   * grid that grows every time you press a button.
   */
  const tabCards = (value: unknown, belongs: RegExp, fallback: any[]) => {
    const kept = cards(value, []).filter((card: any) => belongs.test(String(card?.link || "")));
    return (kept.length ? kept : fallback).slice(0, 6);
  };

  const IS_PLACE = /^\/(places-to-go\/|[a-z-]+\/$)/;
  const IS_TOUR = /^\/tours\//;
  const IS_STAY = /^\/collection\//;
  /* Inspiration covers the journal and the guide types, which live under
     several prefixes rather than one. */
  const IS_READ = /^\/(blogs|inspirations|travel-guides|things-to-do)\//;

  /* "Where do you want to go" is answered with countries, not with individual
     towns — a visitor picks Vietnam before they pick Hoi An. The country
     taxonomy carries them; the photograph is borrowed from that country's own
     content, so nothing is invented. */
  const countryCards = useMemo(() => {
    return countries.map((term) => {
      const cleanTermSlug = term.slug.toLowerCase().replace(/-tours|-vacations/g, "");
      const own = [...places, ...tours, ...hotels, ...cruises, ...guides].filter((item) => {
        const itemTitle = (item.title || "").toLowerCase();
        if (cleanTermSlug === "cambodia" && (itemTitle.includes("seoul") || itemTitle.includes("korea"))) return false;
        if (cleanTermSlug === "bhutan" && (itemTitle.includes("seoul") || itemTitle.includes("korea") || itemTitle.includes("vietnam"))) return false;
        return (
          item.categories?.some((c) => c.slug === term.slug || c.slug === cleanTermSlug) ||
          item.path?.toLowerCase().includes(`/${cleanTermSlug}/`) ||
          item.title?.toLowerCase().includes(cleanTermSlug)
        );
      });
      /* WordPress first. The eighteen URLs pasted in here instead were
         editorial choices with nowhere to edit them, and four of the
         eighteen pointed at files that were never uploaded - a 404 that
         nothing on this side could notice. They live on the country term
         now; see aat_backfill_country_images(). */
      const foundImage =
        term.image ||
        own.find((i) => i.featuredMedia?.url)?.featuredMedia?.url ||
        "";
      return {
        image_url: foundImage,
        badge: "",
        title: term.name,
        meta: term.count ? `${term.count} journeys & places` : "",
        description: term.description || "",
        link: `/${term.slug}/`,
        link_text: "Explore",
        ph: "",
      };
    });
  }, [countries, places, tours, hotels, cruises, guides]);

  const destinations = useMemo(
    () => tabCards(acf.home_tab_destinations, IS_PLACE, countryCards),
    [acf.home_tab_destinations, countryCards],
  );

  const journeys = useMemo(() => {
    return tabCards(acf.home_tab_journeys, IS_TOUR, tours.map(toCard));
  }, [acf.home_tab_journeys, tours]);

  /* Tab three used to take the newest guides and offer no way to choose. Tabs
     one and two both had a cards field; this one was simply missed. */
  const inspiration = useMemo(
    () => tabCards(acf.home_tab_inspiration, IS_READ, guides.map(toCard)),
    [acf.home_tab_inspiration, guides],
  );

  /* Hero: the WordPress slider drives it; live tours stand in until it is filled. */
  const slides = useMemo(() => {
    const authoredSlides = safeParse(acf.home_banner_slider);
    const fallbackSource = (tours.length ? tours : places).slice(0, 4);
    return authoredSlides.length
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
  }, [acf.home_banner_slider, tours, places]);

  const [heroIndex, setHeroIndex] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetHeroTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        setHeroIndex((i) => (i + 1) % slides.length);
      }, 6000);
    }
  };

  useEffect(() => {
    resetHeroTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  const selectHeroSlide = (idx: number) => {
    setHeroIndex(idx);
    resetHeroTimer();
  };

  // Auto-scroll active destination tab within container ONLY (never hijacks window scroll)
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const container = tabsContainerRef.current;
    const activeBtn = container.children[heroIndex] as HTMLElement;
    if (activeBtn) {
      const targetLeft = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    }
  }, [heroIndex]);

  const hero = slides[heroIndex] || slides[0] || {};
  /* The inset frame these fed - a small second photograph beside the headline -
     went when the hero became a single full-bleed plate. They were still being
     computed on every render, one of them defaulting to the literal words
     "Mekong Delta" for a site that also sells Japan. */

  /**
   * The place a slide is about, taken from where it points.
   *
   * Every slide links to its own country page (/japan/, /bali/), so the
   * destination is a fact already in the data. The `tagline` field holds the
   * word "Travel" on every slide, which as a label above a headline says
   * nothing - better to show no label than a meaningless one.
   */
  const placeOf = (slide: any) => {
    if (slide?.tagline && String(slide.tagline).trim() && String(slide.tagline).trim().toLowerCase() !== "travel") {
      return String(slide.tagline).trim();
    }
    if (slide?.place && String(slide.place).trim()) return String(slide.place).trim();
    if (slide?.country && String(slide.country).trim()) return String(slide.country).trim();
    const slug = String(slide?.link || "").split("/").filter(Boolean).pop() || "";
    if (slug && !slug.includes(".")) {
      return slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
    /* No link to read: the first clause of the title is the place. */
    return String(slide?.description || "").replace(/<[^>]+>/g, "").split(/[,:|–—]/)[0].trim();
  };

  /* WordPress keeps the real headline in `description` ("Timeless Japan"),
     with `title` holding a generic word. */
  const heroHeadline = String(hero.description || hero.title || "").replace(/<[^>]+>/g, "").trim();
  const heroPlace = placeOf(hero);
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

  /* The quote band and the statement band were flat CSS gradients — two
     full-bleed bands of coloured smear on a page that is otherwise all
     photography. Both take a photograph from WordPress; until one is set they
     borrow the sharpest plate the site owns, and each takes from a different
     pool so the two bands never show the same picture. */
  const bandPhoto = (authored: unknown, pools: ArchiveItem[][], taken: string[]) => {
    const set = typeof authored === "string" ? authored.trim() : "";
    if (set) return set;
    for (const pool of pools) {
      const found = pool
        .filter((item) => item.featuredMedia?.url && !taken.includes(item.featuredMedia.url))
        .sort((a, b) => (b.featuredMedia?.width || 0) - (a.featuredMedia?.width || 0))[0];
      if (found?.featuredMedia?.url) return found.featuredMedia.url;
    }
    return "";
  };

  const quoteImage = bandPhoto(acf.quote_image, [places, tours], [responsiblyImage]);
  const storyImage = bandPhoto(acf.story_bar_image, [tours, places, hotels], [responsiblyImage, quoteImage]);

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

  /* ── Section copy and data, all from WordPress ── */
  const str = (key: string, fallback = "") =>
    (typeof acf[key] === "string" && (acf[key] as string).trim()) || fallback;

  const trustItems = (() => {
    const authored = safeParse(acf.trust_items);
    if (authored.length) return authored;
    /* Four things this company can show. No score or award is asserted -
       those go in only when WordPress holds a source. */
    return [
      { text: "Tailor-made itineraries" },
      { text: "Handpicked hotels & cruises" },
      { text: "Local Asia specialists" },
      { text: "24/7 in-destination support" },
    ];
  })();
  const introHeadline = str("intro_headline", "Asia is not one journey");
  const introCtaLabel = str("intro_cta_label");
  const introCtaLink = str("intro_cta_link", "/about-us/");
  const statementHtml = String(acf.statement_text || "");

  const tabsHeadline = str("tabs_headline", "Where will Asia take you?");
  const featuredHeadline = str("featured_headline", "Private journeys to begin with");
  const cruisesHeadline = str("stay_headline", "Cruises and stays worth the detour");
  const inspirationHeadline = str("inspiration_headline", "Reading before you go");
  const specialistsHeadline = str("specialists_headline", "The people who plan it");
  const enquiryHeadline = str("plan_headline", "Your Asia journey starts with a conversation");
  const enquiryNote = str("plan_desc", "");

  const team = safeParse(acf.team);

  /* Three to six itineraries with enough on them to judge: a country, a
     duration and a sentence. Tours that carry a duration lead, because that is
     the first thing a traveller asks. */
  const featuredJourneys = [...tours]
    .sort((a, b) => (b.duration ? 1 : 0) - (a.duration ? 1 : 0))
    .slice(0, 6);

  /* Hotels lead. Sorting cruises to the front filled every row with boats —
     five entries all reading "Asia Cruises" — while the addresses the section
     is named for never appeared. Hotels first, then cruises to round it out,
     and the sharpest photograph leads because it takes the whole panel. */
  const sharpest = (items: ArchiveItem[]) =>
    items
      .filter((item) => item.featuredMedia?.url)
      .sort((a, b) => (b.featuredMedia?.width || 0) - (a.featuredMedia?.width || 0));

  /* Four addresses and one vessel. Cruises used to fill every row — five
     entries all reading "Asia Cruises", and not one of the hotels the section
     is named for. Hotels lead and hold the lead plate; a single cruise keeps
     the other half of the section's name honest. */
  const register = [
    ...sharpest(hotels).slice(0, 4),
    ...sharpest(cruises.filter((c) => !hotels.some((h) => h.id === c.id))).slice(0, 1),
  ];

  const editorial = guides.slice(0, 3);

  /* --- journeys carousel --- */
  const journeyTrackRef = useRef<HTMLDivElement>(null);
  const tabRailRef = useRef<HTMLDivElement>(null);

  /* --- map pills --- */
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  /* Labels come from WordPress; the fallbacks are what shipped. */
  const label = (key: string, fallback: string) =>
    (typeof acf[key] === "string" && (acf[key] as string).trim()) || fallback;

  /**
   * Three tabs, in the order a traveller decides.
   *
   * Where first, then what kind of journey, then what to read while they think
   * about it. Four tabs — with "special offers" and "new this season" among
   * them — asked the visitor to care about our merchandising before they had
   * chosen a country.
   */
  const tabs = [
    {
      key: "dest",
      label: label("tab_dest_label", "Explore destinations"),
      rows: destinations,
      all: "/destinations/",
      allLabel: "View all destinations",
    },
    {
      key: "journeys",
      label: label("tab_journeys_label", "Private journeys"),
      rows: journeys,
      all: "/tours/",
      allLabel: "View all journeys",
    },
    {
      key: "inspiration",
      label: label("tab_inspiration_label", "Travel inspiration"),
      rows: inspiration,
      all: "/inspirations/",
      allLabel: "All travel inspiration",
    },
  ];

  return (
    <>
      {/* ═══ KIỂU 2: PANORAMA HORIZON & DESTINATION STRIP HERO ═══ */}
      {/* ═══ HERO — "The Spine" ═══
          The photograph carries the page; everything else is set like the
          margin and spine of a printed volume.

          The right-hand index names the places rather than numbering them.
          These four slides are not a sequence — Japan is not step one of
          anything — so "01 02 03 04" would assert an order that does not
          exist. Reading the place names down the spine is both the honest
          label and the navigation. */}
      <section id="hero" className={`spine-hero ph ${hero.image_url ? "" : "ph-hero"}`}>
        {/* A separate layer so the photograph can drift without moving the
            type sitting on top of it. Full-bleed, untouched by any box or
            band — the plaque covered part of the picture, so the text now
            sits directly on the photograph. */}
        <div
          key={heroIndex}
          className="spine-plate"
          aria-hidden="true"
        >
          {hero.image_url && (
            <Image
              src={hero.image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              loading="eager"
              fetchPriority="high"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          )}
        </div>
        {/* A soft pool of shade, not a hard edge — just enough for the type
            to hold against a bright sky without a line anyone can point to. */}
        <div className="spine-veil" aria-hidden="true" />

        {slides.length > 1 && (
          <nav className="spine-index" aria-label="Choose a destination">
            {slides.map((slide: any, idx: number) => {
              /* Place names, not full titles: "Bali" reads down a spine,
                 "Bali, Culture & Island Escapes" does not. */
              const label = placeOf(slide);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`spine-index-item${idx === heroIndex ? " is-active" : ""}`}
                  onClick={() => selectHeroSlide(idx)}
                  aria-current={idx === heroIndex ? "true" : undefined}
                >
                  <span className="spine-index-tick" aria-hidden="true" />
                  <span className="spine-index-label">{label || `Slide ${idx + 1}`}</span>
                </button>
              );
            })}
          </nav>
        )}

        <div className="container spine-inner">
          <div className="spine-copy" key={`copy-${heroIndex}`}>
            {heroPlace && (
              <p className="spine-place">
                <span className="spine-rule" aria-hidden="true" />
                {heroPlace}
              </p>
            )}
            <h1 className="spine-headline">{heroHeadline}</h1>
            {hero.subtitle && <p className="spine-note">{clamp(hero.subtitle, 118)}</p>}
            <Link href={toLocalHref(hero.link, "/plan-my-trip/")} className="spine-link">
              {String(hero.link_text || "See this journey")}
              <ArrowSvg />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 3 · TRUST BAR ═══
          Four things this company can show, not four adjectives. Nothing here
          asserts a score or an award — those appear only when WordPress holds
          a source for them. */}
      {trustItems.length > 0 && (
        <section className="trustbar">
          <div className="container trustbar-inner">
            {trustItems.map((item: any, idx: number) => (
              <span key={idx}>{String(item.text || "")}</span>
            ))}
          </div>
        </section>
      )}

      {/* ═══ 4 · BRAND INTRODUCTION ═══ */}
      <section className="section on-cream" id="statement">
        <div className="container intro-block">
          <h2 className="intro-headline">{introHeadline}</h2>
          {statementHtml && (
            <div className="intro-copy" dangerouslySetInnerHTML={{ __html: statementHtml }} />
          )}
          {introCtaLabel && (
            <Link href={toLocalHref(introCtaLink, "/about-us/")} className="btn btn-line-ink intro-cta">
              {introCtaLabel}
              <ArrowSvg />
            </Link>
          )}
        </div>
      </section>

      {/* ═══ 5 · DISCOVER YOUR ASIA ═══
          Three tabs, in the order a traveller decides: first where, then what
          kind of journey, then what to read while they think about it. */}
      <section className="section on-white" id="journeys">
        <div className="container">
          <div className="center reveal">
            {/* Headings authored in WordPress carry <em> for the accented word.
                Printed as text they showed the tag itself. */}
            <h2
              style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}
              dangerouslySetInnerHTML={{ __html: tabsHeadline }}
            />
          </div>

          <div className="tabs-row reveal" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn${activeTab === tab.key ? " is-active" : ""}`}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`tab-panel${activeTab === tab.key ? " is-active" : ""} reveal`}
              data-panel={tab.key}
            >
              {/* A row the eye takes in at once, then a link to the whole set —
                  rather than a grid that grows each time you press a button.
                  Cards run smaller here than in the carousels below: this row
                  answers "where", the others answer "which one" — six or
                  seven places should read as a row to scan, not six large
                  photographs. The arrows give the same affordance the other
                  horizontal rows already have. */}
              <div className="tab-rail-wrap">
                <div className="tab-rail" ref={tab.key === activeTab ? tabRailRef : undefined}>
                  {tab.rows.map((card: any, idx: number) => (
                    <Link key={idx} href={toLocalHref(card.link, "/plan-my-trip/")} className="tab-card">
                      <span
                        className={`tab-card-photo ${card.image_url ? "" : "is-empty"}`}
                        style={bg(card.image_url, "card")}
                        aria-hidden="true"
                      />
                      <span className="tab-card-body">
                        <strong>{String(card.title || "")}</strong>
                        {card.meta && <em>{String(card.meta)}</em>}
                        {card.description && <span>{clamp(card.description, 96)}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
                {tab.rows.length > 3 && (
                  <div className="tab-rail-arrows">
                    <button
                      type="button"
                      className="hc-btn"
                      aria-label="Scroll left"
                      onClick={() => tabRailRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                    >
                      <svg style={{ transform: "rotate(180deg)" }}><use href="#i-arrow" /></svg>
                    </button>
                    <button
                      type="button"
                      className="hc-btn"
                      aria-label="Scroll right"
                      onClick={() => tabRailRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                    >
                      <svg><use href="#i-arrow" /></svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="tab-foot">
                <Link href={tab.all} className="btn btn-line-ink">
                  {tab.allLabel}
                  <ArrowSvg />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 7 · FEATURED PRIVATE JOURNEYS ═══
          Two routes out of every card: read it, or ask us to change it. The
          second is the one this business actually sells. */}
      {featuredJourneys.length > 0 && (
        <section className="section on-cream" id="featured">
          <div className="container">
            <div className="hcarousel-head reveal">
              <div>
                <p className="eyebrow">
                  <em dangerouslySetInnerHTML={{ __html: String(acf.featured_eyebrow || "<em>Private</em> Journeys") }} />
                </p>
                <h2
                  style={{ fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}
                  dangerouslySetInnerHTML={{ __html: featuredHeadline }}
                />
              </div>
              <div className="hcarousel-arrows">
                <button className="hc-btn" aria-label="Previous journey" onClick={() => journeyTrackRef.current?.scrollBy({ left: -320, behavior: "smooth" })}>
                  <svg style={{ transform: "rotate(180deg)" }}><use href="#i-arrow" /></svg>
                </button>
                <button className="hc-btn" aria-label="Next journey" onClick={() => journeyTrackRef.current?.scrollBy({ left: 320, behavior: "smooth" })}>
                  <svg><use href="#i-arrow" /></svg>
                </button>
              </div>
            </div>

            <div className="hcarousel-track reveal" ref={journeyTrackRef}>
              {featuredJourneys.map((item, idx) => (
                <Link
                  href={item.path}
                  key={idx}
                  /* `ph` carries background-size:cover — without it a card
                     photograph sits at its natural size in the corner. */
                  className={`hc-card ph ${item.featuredMedia?.url ? "" : "ph-th"}`}
                  style={bg(item.featuredMedia?.url, "card")}
                >
                  <div className="overlay-bottom" />
                  <h3>{item.title}</h3>
                  <p>{clamp(item.excerpt, 110)}</p>
                </Link>
              ))}
            </div>

            <div className="tab-foot">
              <Link href="/tours/" className="btn btn-line-ink">View all journeys<ArrowSvg /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ 8 · CRUISES AND SELECTED STAYS ═══
          One lead address carrying its own photograph, then the rest as a
          numbered index — the layout this section had before, now fed by
          cruises as well as hotels. A property with no photograph still
          reads as a plate rather than a hole. */}
      {register.length > 0 && (
        <section className="section on-white" id="stay">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow">
                <em dangerouslySetInnerHTML={{ __html: String(acf.stay_eyebrow || `<em>Stay</em> With ${BRAND_SHORT}`) }} />
              </p>
              <h2
                style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}
                dangerouslySetInnerHTML={{ __html: cruisesHeadline }}
              />
            </div>

            <div className="stay-editorial reveal">
              {register.slice(0, 1).map((item, idx) => (
                <Link
                  href={item.path}
                  key={idx}
                  className={`stay-lead ${item.featuredMedia?.url ? "has-photo" : ""}`}
                  style={bg(item.featuredMedia?.url, "panel")}
                >
                  <div className="overlay-bottom" />
                  <div className="stay-lead-copy">
                    <span className="stay-plate">Address No. 01</span>
                    <h3>{item.title}</h3>
                    <p>{clamp(item.excerpt, 150)}</p>
                    <span className="link-arrow">Discover<ArrowSvg /></span>
                  </div>
                </Link>
              ))}

              <ol className="stay-index">
                {register.slice(1, 5).map((item, idx) => (
                  <li key={idx}>
                    <Link href={item.path}>
                      <span className="stay-index-num">{String(idx + 2).padStart(2, "0")}</span>
                      <span
                        className={`stay-index-thumb ${item.featuredMedia?.url ? "" : "is-empty"}`}
                        style={bg(item.featuredMedia?.url, "thumb")}
                        aria-hidden="true"
                      >
                        {!item.featuredMedia?.url && String(item.title || "?").trim().charAt(0)}
                      </span>
                      <span className="stay-index-copy">
                        <strong>{item.title}</strong>
                        <em>
                          {clamp(
                            item.categories?.find((c) => c.taxonomy === "country")?.name || item.excerpt,
                            68,
                          )}
                        </em>
                      </span>
                      <ArrowSvg />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            <div className="tab-foot">
              <Link href="/where-to-stay/" className="btn btn-line-ink">View all stays<ArrowSvg /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ 9 · TRAVEL INSPIRATION ═══ */}
      {editorial.length > 0 && (
        <section className="section on-cream" id="inspiration">
          <div className="container">
            <div className="center reveal">
              <h2
                style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}
                dangerouslySetInnerHTML={{ __html: inspirationHeadline }}
              />
            </div>
            <div className="editorial-grid reveal">
              {editorial.map((item) => (
                <Link href={item.path} key={item.id} className="editorial-card">
                  <span
                    className={`editorial-photo ${item.featuredMedia?.url ? "" : "is-empty"}`}
                    style={bg(item.featuredMedia?.url, "card")}
                    aria-hidden="true"
                  />
                  <span className="editorial-body">
                    <em>{item.categories?.find((c) => c.taxonomy === "country")?.name || "Guide"}</em>
                    <strong>{item.title}</strong>
                    <span>{clamp(item.excerpt, 104)}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="tab-foot">
              <Link href="/inspirations/" className="btn btn-line-ink">All travel inspiration<ArrowSvg /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ 10 · SPECIALISTS AND CLIENT STORIES ═══
          The people who plan it beside the people who went. The specialist row
          appears only when WordPress holds real team photographs — a stock
          portrait of someone who does not work here is worse than none. */}
      {/* ═══ MAP ═══ */}
      <section id="map" className="section on-white">
        <div className="container map-grid">
          <div className="map-copy reveal">
            <p className="eyebrow"><em>One</em> Itinerary, Six Countries</p>
            <h2
              dangerouslySetInnerHTML={{ __html: String(acf.map_headline || "Your journey, <em>charted</em> by hand") }}
              style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}
            />
            <p style={{ marginTop: "1.2rem" }}>{String(acf.map_description || "")}</p>
            <div className="pill-list">
              {MAP_COUNTRIES.map((name) => {
                const key = name.toLowerCase();
                return (
                  <button
                    key={key}
                    className={`pill${activeCountry === key ? " is-active" : ""}`}
                    data-country={key}
                    onMouseEnter={() => setActiveCountry(key)}
                    onClick={() => setActiveCountry(key)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
          {/* The same Leaflet map the destination and tour pages use, so a
              route reads the same way everywhere on the site. */}
          <div className="map-stage reveal">
            <RealMapComponent
              stopsList={MAP_COUNTRIES}
              activeCity={activeCountry}
              setActiveCity={setActiveCountry}
            />
          </div>
        </div>
      </section>

      {/* ═══ 10 · SPECIALISTS ═══ */}
      {team.length > 0 && (
        <section className="section on-cream" id="specialists">
          <div className="container">
            <div className="center reveal">
              <h2
                style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}
                dangerouslySetInnerHTML={{ __html: specialistsHeadline }}
              />
            </div>
            <div className="team-grid reveal">
              {team.slice(0, 4).map((member: any, idx: number) => (
                <article className="team-card" key={idx}>
                  {member.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img className="team-photo" src={optimized(member.photo, "card")} alt={String(member.name || "")} loading="lazy" />
                  ) : (
                    <span className="team-photo is-empty" aria-hidden="true">
                      {String(member.name || "?").trim().charAt(0)}
                    </span>
                  )}
                  <h3>{String(member.name || "")}</h3>
                  {member.role && <p className="team-role">{String(member.role)}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CLIENT REVIEWS ═══
          Its own section, as it was before it got folded into "specialists"
          and lost its heading, its rating summary and half its cards in the
          merge — team and reviews answer different questions ("who plans
          it" vs. "was it good") and read oddly sharing one headline. */}
      {testimonials.length > 0 && (
        <section className={`section ${team.length > 0 ? "on-white" : "on-cream"}`} id="reviews">
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
                    <img className="review-logo" src={optimized(reviewLogo, "thumb")} alt={reviewText || "Review site"} style={{ height: "20px", marginRight: "8px" }} />
                  )}
                  {reviewText || "Read reviews"}
                </a>
              )}
            </div>
            <div className="card-grid reveal" style={{ marginTop: "2.4rem" }}>
              {testimonials.slice(0, 6).map((item: any, idx: number) => (
                <div className="review-card" key={idx}>
                  {item.vote && (
                    <p className="review-stars" aria-label={`${item.vote} out of 5`}>
                      {"★".repeat(Math.min(5, Number(item.vote) || 5))}
                    </p>
                  )}
                  <p className="review-quote">“{clamp(item.content, 260)}”</p>
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
      {String(acf.quote_text || "").trim() && (
        <section
          id="quote"
          className={`quote-wrap ph ${quoteImage ? "" : "ph-quote"}`}
          style={quoteImage ? bg(quoteImage, "hero") : undefined}
        >
          <div className="overlay-full" />
          <div className="quote-inner reveal">
            <q>{String(acf.quote_text)}</q>
            <cite>{String(acf.quote_citation || `The Founders, ${BRAND_SHORT}`)}</cite>
          </div>
        </section>
      )}

      {/* ═══ TRAVEL RESPONSIBLY ═══
          The photograph comes from WordPress; until one is set it borrows a
          real plate from the site's own content rather than a coloured smear. */}
      {responsiblyText && (
        <section id="responsibly" className="split">
          <div className="split-copy on-cream reveal">
            <p className="eyebrow"><em>Travel</em> Responsibly</p>
            <h2
              dangerouslySetInnerHTML={{ __html: String(acf.responsibly_headline || `The ${BRAND_SHORT} <em>Foundation</em>`) }}
              style={{ fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}
            />
            <p>
              <span className="dropcap">{responsiblyText.charAt(0)}</span>
              {responsiblyText.slice(1)}
            </p>
            <Link href="/about-us/" className="btn btn-line-ink">See Our Impact</Link>
          </div>
          <div
            className={`split-photo ${responsiblyImage ? "" : "ph ph-la"}`}
            style={responsiblyImage ? bg(responsiblyImage, "hero") : undefined}
          />
        </section>
      )}

      {/* ═══ STORY BAR + VALUES ═══
          Sits where it always sat: the last word before the enquiry form, so
          the four reasons to trust the company are the thing still in view
          when the reader reaches the fields. */}
      <section
        id="values"
        className={`story-bar ph ${storyImage ? "" : "ph-desert"}`}
        style={storyImage ? bg(storyImage, "hero") : undefined}
      >
        <div className="overlay-full" />
        <div className="container story-bar-inner reveal">
          <div>
            <p className="story-tag">{String(acf.story_bar_tagline || "Private Journeys, Composed for You")}</p>
            <h2 dangerouslySetInnerHTML={{ __html: String(acf.story_bar_headline || `The <em>${BRAND_SHORT}</em> Standard`) }} />
          </div>
          <Link href="/about-us/" className="btn btn-line-white">{String(acf.story_bar_link_text || "Read Our Story")}</Link>
        </div>
      </section>

      {coreValues.length > 0 && (
        <section className="value-grid ph ph-desert" id="why">
          <div className="container value-grid-inner reveal">
            {coreValues.map((val: any, idx: number) => (
              <div className="value-item" key={idx}>
                <h4>{String(val.title || "")}</h4>
                <p>{String(val.description || "")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ FINAL ENQUIRY CTA ═══
          This used to be a second, shorter enquiry form living next to the
          full one at /plan-my-trip/ — six fields short of it (no phone,
          no budget, no duration), so a visitor who filled it out gave less
          than the page was designed to collect. One form, reached from
          everywhere, is better than two that disagree. */}
      <section className="section on-ink" id="plan">
        <div className="container plan-cta reveal">
          <p className="eyebrow" dangerouslySetInnerHTML={{ __html: String(acf.plan_eyebrow || "<em>Start</em> Planning") }} />
          <h2
            style={{ fontSize: "clamp(1.9rem,3.6vw,2.8rem)" }}
            dangerouslySetInnerHTML={{ __html: enquiryHeadline }}
          />
          <p>
            {enquiryNote ||
              String(acf.plan_desc) ||
              "Share a few details and a private travel designer will reach out within one business day — no obligation, no call center."}
          </p>
          <Link href="/plan-my-trip/" className="btn btn-fill-cream">
            {String(acf.plan_btn || "Begin Planning My Journey")}
            <ArrowSvg />
          </Link>
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
