"use client";

import Link from "next/link";
import Image from "next/image";
import type { ArchiveItem, ContentRecord } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { SpecialistBlock } from "@/components/v2/SpecialistBlock";
import { bg, optimized } from "@/lib/images";

export function StandardPageTemplateV2({
  data,
  relatedTours = [],
}: {
  data: ContentRecord;
  relatedTours?: ArchiveItem[];
}) {
  const acf = (data.acf || {}) as Record<string, unknown>;
  const hero = data.featuredMedia?.url || (typeof acf.hero_image === "string" ? acf.hero_image : "");
  const title = data.title;
  const eyebrow = typeof acf.eyebrow === "string" ? (acf.eyebrow as string).trim() : "";
  const standfirst = data.excerpt || (typeof acf.page_description === "string" ? (acf.page_description as string).trim() : "");
  const body = data.content || "";

  return (
    <article className="standard-page">
      {/* ═══ MASTHEAD ═══ */}
      <header className="section on-cream standard-page-masthead" style={{ paddingBottom: hero ? "2rem" : "3.5rem" }}>
        <div className="container">
          <p className="crumb">
            <Link href="/">{BRAND_SHORT}</Link>
            <span>/</span>
            <span className="current">{title}</span>
          </p>

          <div className="dispatch-open" style={{ maxWidth: "820px" }}>
            {eyebrow && <span className="dispatch-kicker">{eyebrow}</span>}
            <h1 style={{ fontSize: "clamp(2.2rem,4vw,3.2rem)" }}>{title}</h1>
            {standfirst && (
              <p className="dispatch-standfirst" style={{ marginTop: "1rem", fontSize: "1.12rem" }}>
                {standfirst}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ═══ HERO IMAGE (if available) ═══ */}
      {hero && (
        <figure className="dispatch-plate">
          <div>
            <Image
              src={hero}
              alt={data.featuredMedia?.alt || title}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        </figure>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <section className="section on-white" style={{ paddingTop: "3rem", paddingBottom: "4.5rem" }}>
        <div className="container" style={{ maxWidth: "840px", margin: "0 auto" }}>
          {body && (
            <div
              className="wordpress-content dispatch-prose is-centred"
              style={{ maxWidth: "100%", fontSize: "1.05rem", lineHeight: 1.75 }}
              dangerouslySetInnerHTML={{ __html: body }}
            />
          )}
        </div>
      </section>

      {/* ═══ RELATED PRIVATE JOURNEYS ═══ */}
      {relatedTours.length > 0 && (
        <section className="section on-cream" id="related-journeys">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow" style={{ justifyContent: "center" }}>
                <em>Private</em> Journeys
              </p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>
                Explore Asia With Absolute Asia
              </h2>
            </div>
            <div
              className="hcarousel-track reveal"
              style={{
                justifyContent: relatedTours.length < 4 ? "center" : undefined,
                marginTop: "2.4rem",
              }}
            >
              {relatedTours.map((item) => {
                const img = item.featuredMedia?.url;
                return (
                  <Link
                    href={item.path}
                    className={`hc-card ph ${img ? "" : "ph-vn"}`}
                    style={{ aspectRatio: "3/4.4", ...(bg(img, "card") || {}) }}
                    key={item.id}
                  >
                    <div className="overlay-bottom" />
                    {item.duration && (
                      <span className="hc-card-tag">{item.duration}</span>
                    )}
                    <h3>{item.title}</h3>
                    {item.excerpt && <p>{item.excerpt.slice(0, 110)}...</p>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <SpecialistBlock acf={acf} />
    </article>
  );
}

export default StandardPageTemplateV2;
