"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ArchiveItem } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

export default function HotelDirectoryTemplateV2({
  data,
  hotels = [],
}: {
  data?: any;
  hotels?: ArchiveItem[];
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("collection");

  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 180;
      const sections = ["collection", "explore"].map(id => document.getElementById(id));
      let current = "collection";
      sections.forEach(sec => { if (sec && sec.offsetTop <= pos) current = sec.id; });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Only real hotels: an empty collection says so rather than showing stock
     photography for properties that are not in the collection. */
  const collection = hotels.map((hotel) => {
    const acf = (hotel.acf || {}) as Record<string, unknown>;
    const highlights = typeof acf.hotel_highlights === "string" ? acf.hotel_highlights : "";
    return {
      slug: hotel.slug,
      name: hotel.title,
      location:
        (typeof acf.hotel_location === "string" && acf.hotel_location) ||
        (typeof acf.location_map === "string" && acf.location_map) ||
        hotel.categories?.[0]?.name ||
        "",
      tag: hotel.categories?.[0]?.name || "Asia",
      tagSlug: hotel.categories?.[0]?.slug || "",
      path: hotel.path,
      // A property without its own photograph borrows the first gallery plate.
      photo:
        hotel.featuredMedia?.url ||
        (typeof acf.hero_image === "string" ? acf.hero_image : "") ||
        (Array.isArray(acf.gallery)
          ? (acf.gallery as Array<{ image_url?: string }>).find((row) => row?.image_url)?.image_url || ""
          : ""),
      desc: hotel.excerpt,
      features: highlights.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 4),
    };
  });

  const filteredHotels =
    activeFilter === "all" ? collection : collection.filter((h) => h.tagSlug === activeFilter);

  /* Filter pills follow the countries that actually have hotels. */
  const pills = [
    { key: "all", label: "All Sanctuaries" },
    ...Array.from(
      new Map(
        collection.filter((h) => h.tagSlug).map((h) => [h.tagSlug, { key: h.tagSlug, label: h.tag }]),
      ).values(),
    ),
  ];

  /* First hotel photo stands in for a page with no featured image of its own. */
  const heroImage = data?.featuredMedia?.url || collection.find((h) => h.photo)?.photo || "";

  return (
    <>
      {/* ═══ CINEMATIC FULL-WIDTH HERO ═══ */}
      <section id="hero" style={{ position: "relative", minHeight: "75vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)" }}>
        {heroImage && <Image src={heroImage} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 40%" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "4rem", paddingTop: "8rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Where to Stay</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Luxury Sanctuary Collection"}</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.6rem,5.8vw,4.8rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || <>Where to Stay in <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>Asia</em></>
            )}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.6vw,1.25rem)", maxWidth: "56ch", marginTop: "1.2rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {data?.acf?.page_description || data?.excerpt || "Hand-selected boutique sanctuaries, cliffside villas, and historic royal palaces composed for your bespoke private journey."}
          </p>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.35)", color: "var(--white)", fontSize: "0.78rem", fontWeight: 500, padding: "0.55rem 1.1rem", borderRadius: "2px", letterSpacing: "0.08em" }}>
              <strong style={{ color: "#E2C38E" }}>5-Star</strong> Ultra-Luxury
            </span>
            <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.35)", color: "var(--white)", fontSize: "0.78rem", fontWeight: 500, padding: "0.55rem 1.1rem", borderRadius: "2px", letterSpacing: "0.08em" }}>
              <strong style={{ color: "#E2C38E" }}>100%</strong> Verified Sanctuaries
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
            <Link href="#collection" className={activeSection === "collection" ? "is-active" : ""}>Sanctuary Collection</Link>
            <Link href="#explore" className={activeSection === "explore" ? "is-active" : ""}>Tailor-Made Stays</Link>
          </div>

          <div style={{ width: "100px" }}></div>
        </div>
      </nav>

      {/* ═══ HOTELS GRID ═══ */}
      <section className="section on-cream" id="collection" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="center">
            <p className="eyebrow"><em>Curated</em> Accommodations</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.5rem)" }}>The Asia Hotel Collection</h2>
            <p style={{ marginTop: "0.6rem", color: "var(--text-dim-on-cream)", fontSize: "0.95rem" }}>
              Filter by destination to explore our favorite private villas and boutique hotels.
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="tabs-row" style={{ marginTop: "2rem", justifyContent: "center" }}>
            {pills.map(f => (
              <button
                key={f.key}
                className={`tab-btn${activeFilter === f.key ? " is-active" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Hotel Card Grid (3 Columns) */}
          <div className="card-grid" style={{ marginTop: "3rem" }}>
            {filteredHotels.map((h) => (
              <div key={h.slug} className="offer-card" style={{ borderLeft: "none", border: "1px solid var(--line-on-cream)", background: "var(--cream-2)", overflow: "hidden", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                    {h.photo && <Image src={h.photo} alt="" fill loading="lazy" sizes="(max-width: 760px) 100vw, 33vw" style={{ objectFit: "cover" }} />}
                    <span className="tag-badge">{h.tag}</span>
                  </div>
                  <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
                    <p style={{ fontSize: "0.76rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 600 }}>{h.location}</p>
                    <h3 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginTop: "0.3rem" }}>{h.name}</h3>
                    <p className="desc" style={{ marginTop: "0.6rem", fontSize: "0.92rem", color: "var(--text-dim-on-cream)", lineHeight: 1.65 }}>{h.desc}</p>

                    {/* Features Tags */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "1rem" }}>
                      {h.features.map((feat, idx) => (
                        <span key={idx} style={{ fontSize: "0.7rem", background: "rgba(30,42,61,0.06)", color: "var(--ink)", padding: "0.2rem 0.6rem", borderRadius: "2px", border: "1px solid var(--line-on-cream)" }}>
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
                  <div style={{ paddingTop: "0.8rem", borderTop: "1px solid var(--line-on-cream)" }}>
                    <Link href={h.path} className="link-arrow" style={{ fontSize: "0.8rem", letterSpacing: "0.08em" }}>
                      VIEW HOTEL DETAILS <ArrowSvg />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="section on-ink" id="explore">
        <div className="container center">
          <p className="eyebrow" style={{ justifyContent: "center" }}><em>Bespoke</em> Stays</p>
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>Have a specific hotel in mind?</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>We match your preferred sanctuary and secure exclusive perks with every private itinerary.</p>
          <div style={{ marginTop: "1.8rem" }}>
            <Link href="/vietnam-tours/" className="btn btn-line-white">Plan Your Bespoke Journey</Link>
          </div>
        </div>
      </section>
    </>
  );
}
