"use client";

import WpImage from "@/components/WpImage";
import { LeadForm } from "@/components/LeadForm";
import type { ContentRecord } from "@/lib/types";

export function DestinationTemplate({ content }: { content: ContentRecord }) {
  return (
    <article className="destination-page">
      <section className="destination-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a> / <a href="/destinations">Destinations</a> / <span>{content.title}</span>
          </nav>
          <h1 className="hero-title">{content.title}</h1>
        </div>
        {content.featuredMedia && (
          <div className="container destination-hero-image">
            <WpImage src={content.featuredMedia.url} alt={content.featuredMedia.alt || content.title} priority />
          </div>
        )}
      </section>

      <div className="container content-shell">
        <main className="destination-main">
          <section className="destination-intro wp-content">
            <div dangerouslySetInnerHTML={{ __html: content.content }} />
          </section>
        </main>

        <aside className="destination-sidebar">
          <div className="enquiry-card sticky-card">
            <h2>Plan Your Trip to {content.title}</h2>
            <p>Our local specialists will craft a customized itinerary based on your preferences.</p>
            <LeadForm />
          </div>
        </aside>
      </div>
    </article>
  );
}
