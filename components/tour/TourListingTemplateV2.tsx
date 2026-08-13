"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ArchiveItem } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { bg, optimized } from "@/lib/images";

/* ============================================================
   V2 Tour Listing Template
   Matches tours-vietnam.html pixel-for-pixel
   ============================================================ */

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

export default function TourListingTemplateV2({
  data,
  tours = [],
}: {
  data?: any;
  tours?: ArchiveItem[];
}) {
  const [activeToggle, setActiveToggle] = useState("private");
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  /* Paged client-side so the button can state the real remaining count. */
  const visible = isAllLoaded ? tours : tours.slice(0, 6);

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

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="hero-photo ph ph-vn" style={{ minHeight: "52vh", backgroundImage: data?.featuredMedia?.url ? `url('${optimized(data.featuredMedia.url, "hero")}')` : undefined }}>
        <div className="overlay-bottom"></div>
        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "1rem" }}>
          <p className="crumb" style={{ color: "rgba(239,233,220,0.7)", marginBottom: "1rem" }}>
            <Link href="/" style={{ color: "rgba(239,233,220,0.7)" }}>{BRAND_SHORT}</Link><span>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)", borderColor: "var(--celadon-pale)" }}>Private Journeys</span>
          </p>
          <h1 style={{ color: "var(--white)", fontSize: "clamp(2rem,4.2vw,3.2rem)", maxWidth: "18ch" }}>{data?.title || "Private Asia Journeys, Composed For You"}</h1>
        </div>
      </section>

      {/* ═══ SUBNAV FILTER ═══ */}
      <nav className="subnav">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", padding: "1rem var(--pad)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-dim-on-cream)" }}>Showing 5 of 24 journeys</p>
        </div>
      </nav>

      {/* ═══ TOUR LIST ═══ */}
      <section className="section on-white">
        <div className="container">

          {visible.map((tour) => (
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
          ))}

          {tours.length === 0 && (
            <p className="center" style={{ color: "var(--text-dim-on-cream)", padding: "2rem 0" }}>
              Chưa có hành trình nào được đăng.
            </p>
          )}

          <div className="center reveal" style={{ marginTop: "2.6rem" }}>
            <button
              className="btn btn-line-ink"
              onClick={() => setIsAllLoaded(true)}
              disabled={isAllLoaded || tours.length <= 6}
              style={{ opacity: isAllLoaded || tours.length <= 6 ? 0.6 : 1 }}
            >
              {isAllLoaded || tours.length <= 6
                ? `You've Seen All ${tours.length} Journeys`
                : `Load More Journeys (${tours.length - 6})`}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="section on-ink">
        <div className="container center reveal">
          <p className="eyebrow" style={{ justifyContent: "center" }}><em>Can&apos;t</em> Decide</p>
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>Tell us what you&apos;re after, and we&apos;ll shortlist it for you.</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>A private travel designer will reach out within one business day, no obligation.</p>
          <div style={{ marginTop: "1.8rem" }}><Link href="/#plan" className="btn btn-line-white">Talk to a Travel Designer</Link></div>
        </div>
      </section>
    </>
  );
}
