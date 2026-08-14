import Link from "next/link";

/**
 * "Speak to a specialist" panel.
 *
 * Renders on destinations, places, hotels, tours and guides.
 * Uses custom ACF fields if provided, otherwise displays polished default luxury brand copy.
 */
export function SpecialistBlock({ acf }: { acf?: Record<string, unknown> | null }) {
  const str = (key: string) => {
    const value = acf?.[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const title = str("specialist_title") || "Speak to an Asia Travel Specialist";
  const text =
    str("specialist_text") ||
    "Every journey with Absolute Asia is private, tailor-made, and planned around your exact pace, interests, and preferred style of travel. Connect with a destination specialist to begin designing your bespoke itinerary.";
  const photo =
    str("specialist_photo") ||
    "https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Village-Suite.jpg";
  const phone = str("specialist_phone") || "+1 (800) 736-8187";
  const button = str("specialist_button") || "Plan Your Trip";
  const link = str("specialist_link") || "/#plan";

  return (
    <section className="section on-cream">
      <div className="container">
        <div
          className="reveal"
          style={{
            display: "grid",
            gridTemplateColumns: photo ? "auto 1fr" : "1fr",
            gap: "1.8rem",
            alignItems: "center",
            background: "var(--white)",
            border: "1px solid var(--line-on-cream)",
            borderRadius: "4px",
            padding: "clamp(1.5rem, 3vw, 2.5rem)",
          }}
        >
          {photo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt={title}
              loading="lazy"
              style={{ width: "96px", height: "96px", objectFit: "cover", borderRadius: "50%", border: "2px solid var(--line-on-cream)" }}
            />
          )}
          <div>
            <h3 style={{ fontSize: "clamp(1.25rem,2vw,1.6rem)", fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
              {title}
            </h3>
            <p style={{ marginTop: "0.6rem", color: "var(--text-dim-on-cream)", fontSize: "0.95rem", lineHeight: 1.7 }}>
              {text}
            </p>
            <div style={{ marginTop: "1.2rem", display: "flex", gap: "1.2rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link href={link} className="btn btn-fill-ink">
                {button}
              </Link>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.95rem" }}>
                  {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

