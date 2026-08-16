import Link from "next/link";
import { bg, optimized } from "@/lib/images";

/**
 * Guide sections imported from the legacy country pages: best time to visit,
 * a month-by-month table, popular places, experiences and trip ideas.
 * Each block renders only when the post carries it.
 */

type MonthRow = { month?: string; image_url?: string; description?: string; places_title?: string };

export function GuideSections({ acf }: { acf?: Record<string, unknown> | null }) {
  const str = (key: string) => {
    const value = acf?.[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const months = (Array.isArray(acf?.month_guide) ? acf?.month_guide : []) as MonthRow[];

  const bestTime = str("best_time_html");
  const bestImage = str("best_time_image");
  const popular = str("popular_places_html");
  const experiences = str("experiences_html");
  const tripIdeas = str("trip_ideas_html");

  const nothing = !bestTime && !bestImage && !popular && !experiences && !tripIdeas && months.length === 0;
  if (nothing) return null;

  return (
    <>
      {(bestTime || bestImage) && (
        <section className="section on-white" id="best-time">
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: bestImage ? "1fr 1.1fr" : "1fr", gap: "3rem", alignItems: "center" }}>
              {bestImage && (
                <div style={{ borderRadius: "6px", overflow: "hidden", aspectRatio: "4/3", backgroundImage: `url(${optimized(bestImage, "panel")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              )}
              <div className="reveal">
                <p className="eyebrow"><em>When</em> to Go</p>
                <div className="wordpress-content" style={{ marginTop: "0.8rem" }} dangerouslySetInnerHTML={{ __html: bestTime }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {months.length > 0 && (
        <section className="section on-cream" id="months">
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow" style={{ justifyContent: "center" }}><em>Month</em> by Month</p>
              {str("month_guide_title") && (
                <h2 style={{ fontSize: "clamp(1.6rem,2.8vw,2.2rem)" }}>{str("month_guide_title")}</h2>
              )}
            </div>
            <div className="card-grid reveal" style={{ marginTop: "2.4rem" }}>
              {months.map((row, idx) => (
                <div className="offer-card" key={idx}>
                  <div
                    className="offer-photo ph"
                    style={row.image_url ? bg(row.image_url, "card") : undefined}
                  >
                    {row.month && <span className="tag-badge">{row.month}</span>}
                  </div>
                  {row.places_title && <h3>{row.places_title}</h3>}
                  <p className="desc">{row.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {popular && (
        <section className="section on-white" id="popular">
          <div className="container" style={{ maxWidth: "860px" }}>
            <div className="wordpress-content reveal" dangerouslySetInnerHTML={{ __html: popular }} />
          </div>
        </section>
      )}

      {experiences && (
        <section className="section on-cream" id="ideas">
          <div className="container" style={{ maxWidth: "860px" }}>
            <div className="wordpress-content reveal" dangerouslySetInnerHTML={{ __html: experiences }} />
          </div>
        </section>
      )}

      {tripIdeas && (
        <section className="section on-white" id="trip-ideas">
          <div className="container" style={{ maxWidth: "860px" }}>
            {str("trip_ideas_title") && (
              <h2 className="reveal" style={{ fontSize: "clamp(1.5rem,2.6vw,2rem)", marginBottom: "1rem" }}>
                {str("trip_ideas_title")}
              </h2>
            )}
            <div className="wordpress-content reveal" dangerouslySetInnerHTML={{ __html: tripIdeas }} />
            <div style={{ marginTop: "1.6rem" }}>
              <Link href="/plan-my-trip/" className="btn btn-line-ink">Start Planning</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
