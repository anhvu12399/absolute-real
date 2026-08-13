import Link from "next/link";

/**
 * "Speak to a specialist" panel.
 *
 * The legacy site repeated this block on destinations, places, hotels and
 * guides under different field names; the importer collapses them all into the
 * shared specialist_* fields. Renders nothing when the post has no such block.
 */
export function SpecialistBlock({ acf }: { acf?: Record<string, unknown> | null }) {
  const str = (key: string) => {
    const value = acf?.[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const title = str("specialist_title");
  const text = str("specialist_text");
  const photo = str("specialist_photo");
  const phone = str("specialist_phone");
  const button = str("specialist_button");
  const link = str("specialist_link");

  if (!title && !text) return null;

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
              alt={title || "Travel specialist"}
              loading="lazy"
              style={{ width: "104px", height: "104px", objectFit: "cover", borderRadius: "50%" }}
            />
          )}
          <div>
            {title && (
              <h3 style={{ fontSize: "clamp(1.25rem,2vw,1.6rem)", fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
                {title}
              </h3>
            )}
            {text && (
              <p style={{ marginTop: "0.6rem", color: "var(--text-dim-on-cream)", fontSize: "0.95rem", lineHeight: 1.7 }}>
                {text}
              </p>
            )}
            <div style={{ marginTop: "1.2rem", display: "flex", gap: "1.2rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link href={link || "/#plan"} className="btn btn-fill-ink">
                {button || "Make an Inquiry"}
              </Link>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
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
