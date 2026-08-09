"use client";

import WpImage from "@/components/WpImage";
import type { ContentRecord } from "@/lib/types";
import type { PostCard } from "@/lib/home";

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

export function TourArchiveTemplate({
  title = "Explore Our Tour Packages",
  description = "Tailor-made luxury itineraries designed by local travel experts.",
  tours = [],
}: {
  title?: string;
  description?: string;
  tours?: PostCard[];
}) {
  return (
    <div className="tour-archive-page">
      <section className="archive-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a> / <span>Tours</span>
          </nav>
          <h1 className="archive-title">{title}</h1>
          {description && <p className="archive-desc">{description}</p>}
        </div>
      </section>

      <section className="container native-section">
        <div className="native-card-grid archive-grid">
          {tours.map((post) => (
            <div className="item tour-item" key={post.id}>
              <a href={toLocalHref(post.path)}>
                {post.featuredMedia ? (
                  <WpImage
                    src={post.featuredMedia.url}
                    alt={post.featuredMedia.alt || post.title}
                    sizes="(max-width: 768px) 90vw, 400px"
                  />
                ) : null}
                <span>{post.title}</span>
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </a>
              {post.categories?.length > 0 && (
                <p className="add">{post.categories.map((cat) => cat.name).join(", ")}</p>
              )}
              {post.duration && (
                <div className="cate-post">
                  <p className="time">{post.duration}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
