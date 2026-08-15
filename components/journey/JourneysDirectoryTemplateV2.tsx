"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toLocalHref } from "@/lib/links";
import type { ArchiveItem } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { optimized } from "@/lib/images";
import { BackToTop } from "../v2/BackToTop";

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

export default function JourneysDirectoryTemplateV2({
  data,
  items = [],
}: {
  data?: any;
  items?: ArchiveItem[];
}) {
  /* No stock photography: the page's own image, else the first real item. */
  const heroBg = data?.featuredMedia?.url || items.find((i) => i.featuredMedia?.url)?.featuredMedia?.url || "";
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("journeys");

  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 180;
      const sections = ["journeys", "why"].map(id => document.getElementById(id));
      let current = "journeys";
      sections.forEach(sec => { if (sec && sec.offsetTop <= pos) current = sec.id; });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Cards authored in WordPress win; otherwise real tours fill the grid, and
     the shipped sample is the last resort. */
  const journeysList =
    data?.acf?.journeys ||
    data?.journeys ||
    items.map((tour) => ({
          slug: tour.slug,
          category: tour.categories?.[0]?.slug || "all",
          title: tour.title,
          tag: tour.categories?.[0]?.name || "Tailor-Made",
          days: tour.duration || "",
          photo: tour.featuredMedia?.url || "",
          desc: tour.excerpt,
          price: tour.price || "",
          link: tour.path,
        }));

  const filtered = activeFilter === "all"
    ? journeysList
    : journeysList.filter((j: any) => j.category === activeFilter);

  return (
    <>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section id="hero" style={{ position: "relative", minHeight: "75vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)", ...(heroBg ? { backgroundImage: `url(${optimized(heroBg, "hero")})` } : {}), backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "4rem", paddingTop: "8rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Journeys</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Private Journeys Directory"}</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.6rem,5.8vw,4.8rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || <>Journeys Composed <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>For You</em></>
            )}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.6vw,1.25rem)", maxWidth: "56ch", marginTop: "1.2rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {data?.acf?.page_description || data?.excerpt || "Private tailor-made itineraries across East Asia, Southeast Asia, the Himalayas, and pristine archipelagos."}
          </p>
        </div>
      </section>

      {/* ═══ SUBNAV ═══ */}
      <nav className="tour-subnav" id="tourSubnav" style={{ background: "var(--cream)", borderBottom: "1px solid var(--line-on-cream)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BackToTop />

          <div className="tour-subnav-inner" style={{ flex: 1, justifyContent: "center" }}>
            <Link href="#journeys" className={activeSection === "journeys" ? "is-active" : ""}>All Travel Styles</Link>
            <Link href="#why" className={activeSection === "why" ? "is-active" : ""}>Why Travel Privately</Link>
          </div>

          <div style={{ width: "100px" }}></div>
        </div>
      </nav>

      {/* ═══ JOURNEYS GRID ═══ */}
      <section className="section on-cream" id="journeys" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="center">
            <p className="eyebrow" dangerouslySetInnerHTML={{ __html: String(data?.acf?.directory_eyebrow || "<em>Curated</em> Travel Styles") }} />
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.5rem)" }}>{data?.acf?.directory_headline || "Find Your Travel Style"}</h2>
          </div>

          {/* Filter Pills */}
          <div className="tabs-row" style={{ marginTop: "2rem", justifyContent: "center" }}>
            {[
              { key: "all", label: "All Journeys" },
              { key: "private", label: "Private Tailor-Made" },
              { key: "honeymoon", label: "Honeymoon & Romance" },
              { key: "family", label: "Family Vacations" },
              { key: "culture", label: "Culture & Food" },
              { key: "wellness", label: "Wellness & Spa" },
              { key: "multi", label: "Multi-Country" }
            ].map(f => (
              <button
                key={f.key}
                className={`tab-btn${activeFilter === f.key ? " is-active" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="card-grid" style={{ marginTop: "3rem" }}>
            {filtered.map((j: any) => (
              <div key={j.slug} className="offer-card" style={{ borderLeft: "none", border: "1px solid var(--line-on-cream)", background: "var(--cream-2)", overflow: "hidden", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url('${optimized(j.photo, "card")}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <span className="tag-badge">{j.tag}</span>
                  </div>
                  <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
                    <span style={{ fontSize: "0.76rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 600 }}>{j.days}</span>
                    <h3 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginTop: "0.3rem" }}>{j.title}</h3>
                    <p className="desc" style={{ marginTop: "0.6rem", fontSize: "0.92rem", color: "var(--text-dim-on-cream)", lineHeight: 1.65 }}>{j.desc}</p>
                  </div>
                </div>

                <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.8rem", borderTop: "1px solid var(--line-on-cream)" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}>{j.price}</span>
                    <Link href={toLocalHref(j.link, `/journeys/${j.slug}/`)} className="link-arrow" style={{ fontSize: "0.8rem", letterSpacing: "0.08em" }}>
                      EXPLORE JOURNEY <ArrowSvg />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="section on-ink" id="why">
        <div className="container center">
          <p className="eyebrow" style={{ justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: String(data?.acf?.cta_eyebrow || "<em>Start</em> Planning") }} />
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{data?.acf?.cta_headline || "Ready to compose your bespoke private journey?"}</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>{data?.acf?.cta_description || "Share your travel dates and our private designers will customize your perfect itinerary."}</p>
          <div style={{ marginTop: "1.8rem" }}>
            <Link href="/plan-my-trip/" className="btn btn-line-white">{data?.acf?.cta_button || "Plan My Trip"}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
