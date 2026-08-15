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

export default function CruisesDirectoryTemplateV2({
  data,
  items = [],
}: {
  data?: any;
  items?: ArchiveItem[];
}) {
  /* No stock photography: the page's own image, else the first real item. */
  const heroBg = data?.featuredMedia?.url || items.find((i) => i.featuredMedia?.url)?.featuredMedia?.url || "";
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("cruises");

  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 180;
      const sections = ["cruises", "charter"].map(id => document.getElementById(id));
      let current = "cruises";
      sections.forEach(sec => { if (sec && sec.offsetTop <= pos) current = sec.id; });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cruisesList =
    data?.acf?.cruises ||
    data?.cruises ||
    items.map((item) => ({
      slug: item.slug,
      category: item.categories?.[0]?.slug || "all",
      title: item.title,
      tag: item.categories?.[0]?.name || "Cruise",
      duration: item.duration || "",
      photo: item.featuredMedia?.url || "",
      desc: item.excerpt,
      highlights: [],
      link: item.path,
    }));

  const filtered = activeFilter === "all"
    ? cruisesList
    : cruisesList.filter((c: any) => c.category === activeFilter);

  return (
    <>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section id="hero" style={{ position: "relative", minHeight: "75vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)", ...(heroBg ? { backgroundImage: `url(${optimized(heroBg, "hero")})` } : {}), backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "4rem", paddingTop: "8rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Cruises</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Luxury Waterway Expeditions"}</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.6rem,5.8vw,4.8rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || <>Asia&apos;s Iconic <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>Waterways</em></>
            )}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.6vw,1.25rem)", maxWidth: "56ch", marginTop: "1.2rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {data?.acf?.page_description || data?.excerpt || "Teak-deck junks and boutique riverboats along Halong Bay, Lan Ha Bay, and the unhurried Mekong River."}
          </p>
        </div>
      </section>

      {/* ═══ SUBNAV ═══ */}
      <nav className="tour-subnav" id="tourSubnav" style={{ background: "var(--cream)", borderBottom: "1px solid var(--line-on-cream)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BackToTop />

          <div className="tour-subnav-inner" style={{ flex: 1, justifyContent: "center" }}>
            <Link href="#cruises" className={activeSection === "cruises" ? "is-active" : ""}>Cruise Collection</Link>
            <Link href="#charter" className={activeSection === "charter" ? "is-active" : ""}>Private Vessel Charters</Link>
          </div>

          <div style={{ width: "100px" }}></div>
        </div>
      </nav>

      {/* ═══ CRUISES GRID ═══ */}
      <section className="section on-cream" id="cruises" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="center">
            <p className="eyebrow" dangerouslySetInnerHTML={{ __html: String(data?.acf?.directory_eyebrow || "<em>Boutique</em> Ships &amp; Junks") }} />
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.5rem)" }}>{data?.acf?.directory_headline || "Luxury Asian Cruises"}</h2>
          </div>

          {/* Filter Pills */}
          <div className="tabs-row" style={{ marginTop: "2rem", justifyContent: "center" }}>
            {[
              { key: "all", label: "All Cruises" },
              { key: "halong", label: "Halong & Lan Ha Bay" },
              { key: "mekong", label: "Mekong River" },
              { key: "charter", label: "Private Charter" },
              { key: "comparisons", label: "Comparisons Guide" }
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

          {/* Grid */}
          <div className="card-grid" style={{ marginTop: "3rem" }}>
            {filtered.map((c: any) => (
              <div key={c.slug} className="offer-card" style={{ borderLeft: "none", border: "1px solid var(--line-on-cream)", background: "var(--cream-2)", overflow: "hidden", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url('${optimized(c.photo, "card")}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <span className="tag-badge">{c.tag}</span>
                  </div>
                  <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
                    <span style={{ fontSize: "0.76rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 600 }}>{c.duration}</span>
                    <h3 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginTop: "0.3rem" }}>{c.title}</h3>
                    <p className="desc" style={{ marginTop: "0.6rem", fontSize: "0.92rem", color: "var(--text-dim-on-cream)", lineHeight: 1.65 }}>{c.desc}</p>

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "1rem" }}>
                      {(c.highlights || []).map((h: string, idx: number) => (
                        <span key={idx} style={{ fontSize: "0.7rem", background: "rgba(30,42,61,0.06)", color: "var(--ink)", padding: "0.2rem 0.6rem", borderRadius: "2px", border: "1px solid var(--line-on-cream)" }}>
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
                  <div style={{ paddingTop: "0.8rem", borderTop: "1px solid var(--line-on-cream)" }}>
                    <Link href={toLocalHref(c.link, `/cruises/${c.slug}/`)} className="link-arrow" style={{ fontSize: "0.8rem", letterSpacing: "0.08em" }}>
                      EXPLORE CRUISE <ArrowSvg />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="section on-ink" id="charter">
        <div className="container center">
          <p className="eyebrow" style={{ justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: String(data?.acf?.cta_eyebrow || "<em>Private Charter</em>") }} />
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{data?.acf?.cta_headline || "Charter a private vessel for your family or friends"}</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>{data?.acf?.cta_description || "Enjoy 100% exclusive use of a luxury junk or boutique riverboat with your private chef & captain."}</p>
          <div style={{ marginTop: "1.8rem" }}>
            <Link href="/plan-my-trip/" className="btn btn-line-white">{data?.acf?.cta_button || "Inquire Private Charter"}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
