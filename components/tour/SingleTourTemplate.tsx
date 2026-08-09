"use client";

import { useState } from "react";
import WpImage from "@/components/WpImage";
import { LeadForm } from "@/components/LeadForm";
import type { ContentRecord, TourAcf, ItineraryDay } from "@/lib/types";

function toLocalHref(url?: string | null) {
  if (!url) return "#";
  const raw = url.trim();
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  try {
    const parsed = new URL(raw);
    if (/^(?:www\.)?absoluteasiatours\.com$/i.test(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/\.\//g, "/") || "/";
    }
    return raw;
  } catch {
    return raw;
  }
}

export function SingleTourTemplate({ content }: { content: ContentRecord }) {
  const acf = (content.acf || {}) as TourAcf;
  const itinerary: ItineraryDay[] = (acf.itinerary as ItineraryDay[]) || [];
  const gallery = acf.gallery || [];
  const [openDay, setOpenDay] = useState<number | null>(0);

  const toggleDay = (index: number) => {
    setOpenDay((current) => (current === index ? null : index));
  };

  return (
    <article className="single-tour-page">
      {/* Tour Hero Banner */}
      <section className="tour-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb navigation">
            <a href="/">Home</a> / <a href="/tours">Tours</a> / <span>{content.title}</span>
          </nav>
          <h1 className="tour-title">{content.title}</h1>
          <div className="tour-meta-pills">
            {acf.duration && (
              <span className="pill">
                <i className="far fa-clock" /> {acf.duration}
              </span>
            )}
            {acf.start_location && (
              <span className="pill">
                <i className="fas fa-map-marker-alt" /> {acf.start_location}
              </span>
            )}
            {acf.code && (
              <span className="pill">
                <i className="fas fa-tag" /> Tour Code: {acf.code}
              </span>
            )}
          </div>
        </div>

        {/* Gallery Grid / Hero Banner Image */}
        <div className="container tour-gallery-wrapper">
          {content.featuredMedia ? (
            <div className="hero-featured-image">
              <WpImage src={content.featuredMedia.url} alt={content.featuredMedia.alt || content.title} priority />
            </div>
          ) : gallery.length > 0 ? (
            <div className="hero-featured-image">
              <WpImage src={gallery[0]} alt={content.title} priority />
            </div>
          ) : null}
        </div>
      </section>

      {/* Main Tour Body + Sticky Enquiry Sidebar */}
      <div className="container content-shell">
        <main className="tour-main-content">
          {/* Overview & Description */}
          <section className="tour-section tour-overview">
            <h2>Overview</h2>
            <div className="wp-content" dangerouslySetInnerHTML={{ __html: content.content }} />
          </section>

          {/* Highlights */}
          {acf.highlights && (
            <section className="tour-section tour-highlights">
              <h2>Tour Highlights</h2>
              <div className="wp-content" dangerouslySetInnerHTML={{ __html: acf.highlights }} />
            </section>
          )}

          {/* Itinerary Accordion */}
          {itinerary.length > 0 && (
            <section className="tour-section tour-itinerary">
              <h2>Detailed Itinerary</h2>
              <div className="itinerary-accordion">
                {itinerary.map((item, idx) => {
                  const isOpen = openDay === idx;
                  return (
                    <div className={`itinerary-day ${isOpen ? "is-open" : ""}`} key={idx}>
                      <button
                        type="button"
                        className="day-header"
                        onClick={() => toggleDay(idx)}
                        aria-expanded={isOpen}
                      >
                        <span className="day-number">{item.day || `Day ${idx + 1}`}</span>
                        <span className="day-title">{item.title || `Day ${idx + 1}`}</span>
                        <i className={`fas fa-chevron-${isOpen ? "up" : "down"}`} />
                      </button>
                      {isOpen && (
                        <div className="day-body">
                          {item.image && (
                            <div className="day-image">
                              <WpImage src={item.image} alt={item.title || `Day ${idx + 1}`} />
                            </div>
                          )}
                          <div className="wp-content" dangerouslySetInnerHTML={{ __html: item.content || "" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Inclusions & Exclusions */}
          {(acf.inclusions || acf.exclusions) && (
            <section className="tour-section tour-inclusions-grid">
              {acf.inclusions && (
                <div className="inc-box inclusions">
                  <h3>What is Included</h3>
                  <div className="wp-content" dangerouslySetInnerHTML={{ __html: acf.inclusions }} />
                </div>
              )}
              {acf.exclusions && (
                <div className="inc-box exclusions">
                  <h3>What is Excluded</h3>
                  <div className="wp-content" dangerouslySetInnerHTML={{ __html: acf.exclusions }} />
                </div>
              )}
            </section>
          )}
        </main>

        {/* Sidebar Enquiry Form */}
        <aside className="tour-sidebar">
          <div className="enquiry-card sticky-card">
            <h2>Customize This Journey</h2>
            <p>Speak with our Asia travel specialist to tailor this itinerary to your budget and preferences.</p>
            <LeadForm />
          </div>
        </aside>
      </div>
    </article>
  );
}
