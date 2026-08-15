"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toLocalHref } from "@/lib/links";
import type { ArchiveItem } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

export default function InspirationDirectoryTemplateV2({
  data,
  items = [],
}: {
  data?: any;
  items?: ArchiveItem[];
}) {
  /* No stock photography: the page's own image, else the first real item. */
  const heroBg = data?.featuredMedia?.url || items.find((i) => i.featuredMedia?.url)?.featuredMedia?.url || "";
  const [activeFilter, setActiveFilter] = useState("all");

  const articlesList =
    data?.acf?.articles ||
    data?.articles ||
    items.map((item) => ({
          slug: item.slug,
          category: item.categories?.[0]?.slug || "all",
          title: item.title,
          tag: item.categories?.[0]?.name || (item.type === "blog" ? "Story" : "Guide"),
          readTime: (item.acf as Record<string, unknown>)?.read_minutes
            ? `${(item.acf as Record<string, unknown>).read_minutes} Min Read`
            : "",
          photo: item.featuredMedia?.url || "",
          desc: item.excerpt,
          link: item.path,
        }));

  const filtered = activeFilter === "all"
    ? articlesList
    : articlesList.filter((a: any) => a.category === activeFilter);

  return (
    <>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section id="hero" style={{ position: "relative", minHeight: "75vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)" }}>
        {heroBg && <Image src={heroBg} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 40%" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "4rem", paddingTop: "8rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Travel Inspiration</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Insider Travel Journal"}</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.6rem,5.8vw,4.8rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || <>Travel <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>Inspiration</em></>
            )}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.6vw,1.25rem)", maxWidth: "56ch", marginTop: "1.2rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {data?.acf?.page_description || data?.excerpt || "Curated destination guides, seasonal advice, and luxury travel insights written by our Asia specialists."}
          </p>
        </div>
      </section>

      {/* ═══ ARTICLES SECTION ═══ */}
      <section className="section on-cream" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="center">
            <p className="eyebrow"><em>Curated</em> Journal Articles</p>
            <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.5rem)" }}>Explore Our Travel Journal</h2>
          </div>

          {/* Filter Pills */}
          <div className="tabs-row" style={{ marginTop: "2rem", justifyContent: "center" }}>
            {[
              { key: "all", label: "All Articles" },
              { key: "guides", label: "Destination Guides" },
              { key: "ideas", label: "Itinerary Ideas" },
              { key: "hotels", label: "Where to Stay" },
              { key: "cruises", label: "Cruise Guides" },
              { key: "planning", label: "Planning Advice" }
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
            {filtered.map((a: any) => (
              <div key={a.slug} className="offer-card" style={{ borderLeft: "none", border: "1px solid var(--line-on-cream)", background: "var(--cream-2)", overflow: "hidden", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                    {a.photo && <Image src={a.photo} alt="" fill loading="lazy" sizes="(max-width: 760px) 100vw, 33vw" style={{ objectFit: "cover" }} />}
                    <span className="tag-badge">{a.tag}</span>
                  </div>
                  <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
                    <span style={{ fontSize: "0.76rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 600 }}>{a.readTime}</span>
                    <h3 style={{ fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginTop: "0.3rem" }}>{a.title}</h3>
                    <p className="desc" style={{ marginTop: "0.6rem", fontSize: "0.92rem", color: "var(--text-dim-on-cream)", lineHeight: 1.65 }}>{a.desc}</p>
                  </div>
                </div>

                <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
                  <div style={{ paddingTop: "0.8rem", borderTop: "1px solid var(--line-on-cream)" }}>
                    <Link href={toLocalHref(a.link, `/inspiration/${a.slug}/`)} className="link-arrow" style={{ fontSize: "0.8rem", letterSpacing: "0.08em" }}>
                      READ JOURNAL ARTICLE <ArrowSvg />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
