"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ArchiveItem, TermInfo } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { bg, optimized } from "@/lib/images";

const RealMapComponent = dynamic(() => import("./RealMapComponent"), { ssr: false });

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

export default function AllDestinationsTemplateV2({
  data,
  items = [],
  countries = [],
}: {
  data?: any;
  items?: ArchiveItem[];
  /** `country` terms; each carries the region its filter pill belongs to. */
  countries?: TermInfo[];
}) {
  /* No stock photography: the page's own image, else the first real item. */
  const heroBg = data?.featuredMedia?.url || items.find((i) => i.featuredMedia?.url)?.featuredMedia?.url || "";
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("featured");
  const [activeCity, setActiveCity] = useState<string | null>(null);

  /* --- Reveal animation observer --- */
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal:not(.is-visible)");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      reveals.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });
      reveals.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }
  }, []);

  /* --- ScrollSpy for Subnav --- */
  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 180;
      const sections = ["featured", "map", "explore"].map(id => document.getElementById(id));
      let current = "featured";
      sections.forEach(sec => { if (sec && sec.offsetTop <= pos) current = sec.id; });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Regions come from the taxonomy the importer filled in. */
  const regionBySlug = new Map<string, string>();
  for (const term of countries) {
    if (term.region) regionBySlug.set(term.slug, term.region);
  }

  const REGION_LABELS: Record<string, string> = {
    southeast: "Southeast Asia",
    east: "East Asia",
    south: "South Asia",
    himalaya: "Himalayas & North",
    isles: "Islands & Atolls",
    silkroad: "Silk Road & Beyond",
    cruises: "Cruises",
  };

  /* Countries when the taxonomy is populated, otherwise the raw archive. Both
     carry real photographs — nothing is invented for an empty site. */
  type DestinationCard = {
    key: string;
    region: string;
    name: string;
    desc: string;
    photo: string;
    link: string;
    tag: string;
  };

  const destinations: DestinationCard[] = countries.length
    ? countries.map((term) => {
        /* Country terms carry no description on the legacy site, so a card
           would print a heading over blank space. What we do know is how much
           is published for that country - which is the useful thing anyway. */
        const own = items.filter((item) => item.categories?.some((c) => c.slug === term.slug));
        const count = term.count || own.length;

        return {
          key: term.slug,
          region: term.region || "all",
          name: term.name,
          desc:
            term.description?.trim() ||
            (count > 0
              ? `${count} ${count === 1 ? "journey and place" : "journeys and places"} we publish across ${term.name}, each one planned by a specialist who has travelled it.`
              : ""),
          photo: term.image || own.find((item) => item.featuredMedia?.url)?.featuredMedia?.url || "",
          /* The country page lives at /{slug}/. Pointing at /destinations/{slug}/
             sent every card on this page to a 404. */
          link: `/${term.slug}/`,
          tag: REGION_LABELS[term.region || ""] || "Asia",
        };
      })
    : items.map((item) => ({
        key: item.slug,
        region: regionBySlug.get(item.categories?.[0]?.slug || item.slug) || "all",
        name: item.title,
        desc: item.excerpt,
        photo: item.featuredMedia?.url || "",
        link: item.path,
        tag: item.categories?.[0]?.name || "Asia",
      }));

  /* The three travel modes each borrow a real photograph from the archive so
     the strip never renders as flat colour. */
  const photos = items.map((i) => i.featuredMedia?.url).filter(Boolean) as string[];
  const waysToTravel = [
    {
      title: "Private Tailor-Made Journeys",
      desc: "Your own guide, chauffeur, and custom itinerary tuned to your rhythm.",
      link: "/tours/",
      photo: photos[0] || "",
    },
    {
      title: "Luxury River & Ocean Cruises",
      desc: "Teak-deck junks and boutique riverboats along Asia's iconic waterways.",
      link: "/cruises/halong-bay/",
      photo: photos[1] || "",
    },
    {
      title: "Multi-Country Expeditions",
      desc: "Threading Vietnam, Cambodia, Laos, and Thailand into one seamless story.",
      link: "/destinations/",
      photo: photos[2] || "",
    },
  ];

  /* Pills and their counts follow the data, so nothing promises "21 Countries"
     when the site holds a different number. */
  const counts = destinations.reduce<Record<string, number>>((acc, d) => {
    acc[d.region] = (acc[d.region] || 0) + 1;
    return acc;
  }, {});
  const filterPills = [
    { key: "all", label: `All ${destinations.length} Destinations` },
    ...Object.keys(REGION_LABELS)
      .filter((key) => counts[key])
      .map((key) => ({ key, label: `${REGION_LABELS[key]} (${counts[key]})` })),
  ];

  const filteredDestinations = activeFilter === "all"
    ? destinations
    : destinations.filter(d => d.region === activeFilter);

  const mapStops = destinations.map(d => ({
    key: d.key,
    label: d.name
  }));

  return (
    <>
      {/* ═══ CINEMATIC FULL-WIDTH HERO ═══ */}
      <section id="hero" className="all-destinations-hero" style={{ position: "relative", minHeight: "75vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)", ...(heroBg ? { backgroundImage: `url(${optimized(heroBg, "hero")})` } : {}), backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "4rem", paddingTop: "8rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Destinations</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>Composed For You · All Destinations Directory</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.6rem,5.8vw,4.8rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            Explore Asia, <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>Unbound</em>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.6vw,1.25rem)", maxWidth: "56ch", marginTop: "1.2rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            From imperial sanctuaries and mist-shrouded peaks to tropical archipelagos — 21 extraordinary Asian destinations composed for discerning travelers.
          </p>

          {/* Region Quick Stats Badges */}
          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.35)", color: "var(--white)", fontSize: "0.78rem", fontWeight: 500, padding: "0.55rem 1.1rem", borderRadius: "2px", letterSpacing: "0.08em" }}>
              <strong style={{ color: "#E2C38E" }}>21</strong> Countries
            </span>
            <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.35)", color: "var(--white)", fontSize: "0.78rem", fontWeight: 500, padding: "0.55rem 1.1rem", borderRadius: "2px", letterSpacing: "0.08em" }}>
              <strong style={{ color: "#E2C38E" }}>100%</strong> Tailor-Made &amp; Private
            </span>
            <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.35)", color: "var(--white)", fontSize: "0.78rem", fontWeight: 500, padding: "0.55rem 1.1rem", borderRadius: "2px", letterSpacing: "0.08em" }}>
              <strong style={{ color: "#E2C38E" }}>5-Star</strong> Boutique Hideaways
            </span>
          </div>
        </div>
      </section>

      {/* ═══ SUBNAV ═══ */}
      <nav className="tour-subnav" id="tourSubnav" style={{ background: "var(--cream)", borderBottom: "1px solid var(--line-on-cream)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", background: "none", border: "none", cursor: "pointer", color: "var(--ink)", paddingBottom: "0.3rem" }}>
            Back to Top <svg style={{ width: "16px", height: "16px", transform: "rotate(-90deg)" }}><use href="#i-arrow"></use></svg>
          </button>

          <div className="tour-subnav-inner" style={{ flex: 1, justifyContent: "center" }}>
            <Link href="#featured" className={activeSection === "featured" ? "is-active" : ""}>All Destinations</Link>
            <Link href="#map" className={activeSection === "map" ? "is-active" : ""}>Interactive Asia Map</Link>
            <Link href="#explore" className={activeSection === "explore" ? "is-active" : ""}>Ways to Explore</Link>
          </div>

          <div style={{ width: "100px" }}></div>
        </div>
      </nav>

      {/* ═══ FEATURED DESTINATIONS (ALL 21 COUNTRIES) ═══ */}
      <section className="section on-cream" id="featured" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="center">
            <p className="eyebrow"><em>See Where</em> {BRAND_SHORT} Can Take You</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.5rem)" }}>Discover All Asia Destinations</h2>
            <p style={{ marginTop: "0.6rem", color: "var(--text-dim-on-cream)", fontSize: "0.95rem" }}>
              Filter by region or scroll to explore our full directory of private luxury travel.
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="tabs-row" style={{ marginTop: "2rem", justifyContent: "center" }}>
            {filterPills.map(f => (
              <button
                key={f.key}
                className={`tab-btn${activeFilter === f.key ? " is-active" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Destination Grid (3 Columns) */}
          <div className="card-grid" style={{ marginTop: "3rem" }}>
            {filteredDestinations.map(d => (
              <Link key={d.key} href={d.link} className="offer-card dest-card" style={{ borderLeft: "none", border: "1px solid var(--line-on-cream)", background: "var(--cream-2)", overflow: "hidden", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url('${optimized(d.photo, "card")}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        transition: "transform 0.4s ease"
                      }}
                    />
                    <span className="tag-badge">{d.tag}</span>
                  </div>
                  <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
                    <h3 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}>{d.name}</h3>
                    <p className="desc" style={{ marginTop: "0.6rem", fontSize: "0.92rem", color: "var(--text-dim-on-cream)", lineHeight: 1.65 }}>{d.desc}</p>
                  </div>
                </div>

                <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
                  <div style={{ paddingTop: "0.8rem", borderTop: "1px solid var(--line-on-cream)" }}>
                    {/* The whole card is the link now; this is the affordance,
                        not a second target. */}
                    <span className="link-arrow" style={{ fontSize: "0.8rem", letterSpacing: "0.08em" }}>
                      EXPLORE {d.name.toUpperCase()} <ArrowSvg />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INTERACTIVE ROUTE MAP ═══ */}
      <section className="section on-cream" id="map">
        <div className="container">
          <div className="center">
            <p className="eyebrow"><em>Chart</em> Your Course</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.4rem)" }}>Interactive Asia Route Map</h2>
            <p style={{ marginTop: "0.8rem", color: "var(--text-dim-on-cream)", maxWidth: "50ch", marginLeft: "auto", marginRight: "auto" }}>
              Explore coordinates across Asia — click any destination pin to zoom and fly directly to the region.
            </p>
          </div>

          <div style={{ marginTop: "2.5rem", height: "520px", width: "100%" }}>
            <RealMapComponent stopsList={mapStops} activeCity={activeCity} setActiveCity={setActiveCity} showLines={false} />
          </div>
        </div>
      </section>

      {/* ═══ WAYS TO EXPLORE ═══ */}
      <section className="section on-white" id="explore">
        <div className="container">
          <div className="center">
            <p className="eyebrow"><em>Ways</em> to Travel</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.4rem)" }}>Bespoke Modes of Travel</h2>
          </div>

          <div className="ways-grid" style={{ marginTop: "2.6rem" }}>
            {waysToTravel.map((way, idx) => (
              <Link
                href={way.link}
                key={idx}
                className={`ways-item ph ${way.photo ? "" : "ph-vn"}`}
                style={way.photo ? bg(way.photo, "card") : undefined}
              >
                <div className="overlay-bottom"></div>
                <h3>{way.title}</h3>
                <p>{way.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="section on-ink">
        <div className="container center">
          <p className="eyebrow" style={{ justifyContent: "center" }}><em>Start</em> Planning</p>
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>Ready to compose your private Asia journey?</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>Share your preferences and a private travel designer will reach out within one business day.</p>
          <div style={{ marginTop: "1.8rem" }}>
            <Link href="/vietnam-tours/" className="btn btn-line-white">Explore All Journeys</Link>
          </div>
        </div>
      </section>
    </>
  );
}
