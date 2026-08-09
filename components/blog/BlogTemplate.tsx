"use client";

import WpImage from "@/components/WpImage";
import { LeadForm } from "@/components/LeadForm";
import type { ContentRecord } from "@/lib/types";

export function BlogTemplate({ content }: { content: ContentRecord }) {
  return (
    <article className="blog-page">
      <section className="blog-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a> / <a href="/blog">Blog</a> / <span>{content.title}</span>
          </nav>
          <h1 className="blog-title">{content.title}</h1>
          {content.date && <p className="blog-date">{new Date(content.date).toLocaleDateString()}</p>}
        </div>
        {content.featuredMedia && (
          <div className="container blog-hero-image">
            <WpImage src={content.featuredMedia.url} alt={content.featuredMedia.alt || content.title} priority />
          </div>
        )}
      </section>

      <div className="container content-shell">
        <main className="blog-main wp-content">
          <div dangerouslySetInnerHTML={{ __html: content.content }} />
        </main>

        <aside className="blog-sidebar">
          <div className="enquiry-card sticky-card">
            <h2>Plan Your Tailor-Made Journey</h2>
            <p>Get a custom itinerary from our local Asia experts.</p>
            <LeadForm />
          </div>
        </aside>
      </div>
    </article>
  );
}
