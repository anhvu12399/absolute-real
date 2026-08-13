import Link from "next/link";
import type { ArchiveItem, TermInfo } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { bg } from "@/lib/images";

/**
 * Archive for any taxonomy term — tags, cities, hotel services, inspirations.
 *
 * These URLs are already indexed on the legacy site, so they must keep
 * resolving. The page is intentionally plain and text-first: its job is to hold
 * the ranking and route visitors onward, not to compete with the hubs.
 */

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

const TAXONOMY_LABEL: Record<string, string> = {
  post_tag: "Tag",
  category: "Category",
  country: "Destination",
  city: "City",
  hotel_service: "Hotel Service",
  "blog-type": "Journal",
  inspiration: "Inspiration",
};

export default function TaxonomyArchiveTemplate({
  term,
  items,
}: {
  term: TermInfo;
  items: ArchiveItem[];
}) {
  const label = TAXONOMY_LABEL[term.taxonomy] || "Archive";
  const lead = items.find((item) => item.featuredMedia?.url);

  return (
    <>
      <section
        className={`hero-photo ph ${lead?.featuredMedia?.url ? "" : "ph-vn"}`}
        style={{
          minHeight: "42vh",
          ...(lead?.featuredMedia?.url ? bg(lead.featuredMedia.url, "hero") : {}),
        }}
      >
        <div className="overlay-bottom"></div>
        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "1.4rem" }}>
          <span className="hero-tag">{label}</span>
          <h1 style={{ color: "var(--white)", fontSize: "clamp(1.9rem,4vw,3rem)", maxWidth: "20ch" }}>
            {term.name}
          </h1>
        </div>
      </section>

      <section className="section on-cream">
        <div className="container">
          <p className="crumb" style={{ marginBottom: "1.6rem" }}>
            <Link href="/">{BRAND_SHORT}</Link><span>/</span>
            <span className="current">{term.name}</span>
          </p>

          {term.description && (
            <p style={{ maxWidth: "70ch", color: "var(--text-dim-on-cream)", lineHeight: 1.8 }}>
              {term.description}
            </p>
          )}

          <p className="eyebrow" style={{ marginTop: "1.8rem" }}>
            <em>{items.length}</em> {items.length === 1 ? "journey" : "journeys"} filed under {term.name}
          </p>

          {items.length > 0 ? (
            <div className="card-grid" style={{ marginTop: "2rem" }}>
              {items.map((item) => (
                <Link
                  href={item.path}
                  key={item.id}
                  className="offer-card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    className="offer-photo ph"
                    style={item.featuredMedia?.url ? bg(item.featuredMedia.url, "card") : undefined}
                  >
                    {item.categories?.[0]?.name && <span className="tag-badge">{item.categories[0].name}</span>}
                  </div>
                  <h3>{item.title}</h3>
                  {item.duration && <p className="offer-meta">{item.duration}</p>}
                  <p className="desc">{item.excerpt}</p>
                  <span className="link-arrow">Explore<ArrowSvg /></span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: "1.4rem", color: "var(--text-dim-on-cream)" }}>
              Nothing is filed under {term.name} yet. Browse{" "}
              <Link href="/tours/" className="link-arrow">all journeys</Link> instead.
            </p>
          )}

          <div className="center" style={{ marginTop: "3rem" }}>
            <Link href="/#plan" className="btn btn-fill-ink">Plan a Private Journey</Link>
          </div>
        </div>
      </section>
    </>
  );
}
