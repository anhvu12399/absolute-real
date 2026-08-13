"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_SHORT } from "@/lib/site";
import { optimized } from "@/lib/images";

export default function PlanTripTemplateV2({ data, fallbackImage = "" }: { data?: any; fallbackImage?: string }) {
  /* No stock photography: only this page's own featured image. */
  const heroBg = data?.featuredMedia?.url || fallbackImage;
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    destinations: ["Vietnam"],
    travelers: "2 Adults",
    duration: "10-14 Days",
    budget: "$6,000 - $10,000 pp",
    name: "",
    email: "",
    phone: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section id="hero" style={{ position: "relative", minHeight: "65vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)", ...(heroBg ? { backgroundImage: `url(${optimized(heroBg, "hero")})` } : {}), backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "3.5rem", paddingTop: "7rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Plan My Trip</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Bespoke Travel Inquiry"}</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.5rem,5.5vw,4.5rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || <>Compose Your <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>Journey</em></>
            )}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.5vw,1.2rem)", maxWidth: "56ch", marginTop: "1rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {data?.acf?.page_description || data?.excerpt || "Tell us about your dream Asia trip and a private travel designer will tailor a custom itinerary within 24 hours."}
          </p>
        </div>
      </section>

      {/* ═══ FORM SECTION ═══ */}
      <section id="form" className="section on-cream" style={{ background: "var(--cream)" }}>
        <div className="container" style={{ maxWidth: "860px" }}>
          {submitted ? (
            <div style={{ background: "var(--white)", padding: "3.5rem 2.5rem", borderRadius: "4px", border: "1px solid var(--line-on-cream)", textAlign: "center" }}>
              <span style={{ fontSize: "2.8rem" }}>🥂</span>
              <h2 style={{ fontSize: "2.2rem", fontFamily: "'Playfair Display', serif", marginTop: "1rem" }}>Inquiry Received!</h2>
              <p style={{ color: "var(--text-dim-on-cream)", marginTop: "0.8rem", fontSize: "1.05rem", lineHeight: 1.7 }}>
                Thank you for contacting {BRAND_SHORT}. One of our senior Asia travel specialists will review your preferences and email your personalized draft itinerary within one business day.
              </p>
              <div style={{ marginTop: "2rem" }}>
                <Link href="/" className="btn btn-fill-ink">Return to Homepage</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: "var(--white)", padding: "clamp(2rem,4vw,3.2rem)", borderRadius: "4px", border: "1px solid var(--line-on-cream)", boxShadow: "0 12px 36px rgba(0,0,0,0.06)" }}>
              <div className="center" style={{ marginBottom: "2.2rem" }}>
                <p className="eyebrow" style={{ justifyContent: "center" }}><em>Tailor-Made</em> Request</p>
                <h2 style={{ fontSize: "1.8rem" }}>Start Planning Your Private Journey</h2>
              </div>

              {/* Step 1: Destinations */}
              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.8rem" }}>
                  1. Which destinations would you like to visit?
                </label>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {["Vietnam", "Thailand", "Cambodia", "Laos", "Japan", "Bhutan", "Bali & Indonesia"].map(dest => (
                    <button
                      type="button"
                      key={dest}
                      onClick={() => {
                        const current = formData.destinations;
                        if (current.includes(dest)) {
                          setFormData({ ...formData, destinations: current.filter(d => d !== dest) });
                        } else {
                          setFormData({ ...formData, destinations: [...current, dest] });
                        }
                      }}
                      style={{
                        padding: "0.6rem 1.1rem",
                        fontSize: "0.85rem",
                        borderRadius: "2px",
                        border: formData.destinations.includes(dest) ? "2px solid var(--rust)" : "1px solid var(--line-on-cream)",
                        background: formData.destinations.includes(dest) ? "rgba(72,98,79,0.08)" : "var(--cream)",
                        color: formData.destinations.includes(dest) ? "var(--rust)" : "var(--ink)",
                        fontWeight: formData.destinations.includes(dest) ? 600 : 400,
                        cursor: "pointer"
                      }}
                    >
                      {dest} {formData.destinations.includes(dest) && "✓"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Duration & Travelers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>
                    Trip Duration
                  </label>
                  <select
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    style={{ width: "100%", padding: "0.85rem", border: "1px solid var(--line-on-cream)", borderRadius: "2px", background: "var(--cream)", color: "var(--ink)", fontSize: "0.9rem" }}
                  >
                    <option>7 - 10 Days</option>
                    <option>10 - 14 Days</option>
                    <option>14 - 21 Days</option>
                    <option>21+ Days</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>
                    Travelers
                  </label>
                  <select
                    value={formData.travelers}
                    onChange={e => setFormData({ ...formData, travelers: e.target.value })}
                    style={{ width: "100%", padding: "0.85rem", border: "1px solid var(--line-on-cream)", borderRadius: "2px", background: "var(--cream)", color: "var(--ink)", fontSize: "0.9rem" }}
                  >
                    <option>Solo Traveler</option>
                    <option>Couples / 2 Adults</option>
                    <option>Family (3 - 5 People)</option>
                    <option>Private Group (6+ People)</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Contact Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: "100%", padding: "0.85rem", border: "1px solid var(--line-on-cream)", borderRadius: "2px", background: "var(--cream)", color: "var(--ink)", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="eleanor@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: "100%", padding: "0.85rem", border: "1px solid var(--line-on-cream)", borderRadius: "2px", background: "var(--cream)", color: "var(--ink)", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>
                  Special Wishes &amp; Travel Preferences
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your preferred travel dates, interest in wellness/cooking/culture, preferred hotel styles..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: "100%", padding: "0.85rem", border: "1px solid var(--line-on-cream)", borderRadius: "2px", background: "var(--cream)", color: "var(--ink)", fontSize: "0.9rem" }}
                />
              </div>

              <button type="submit" className="btn btn-fill-ink" style={{ width: "100%", padding: "1.1rem", fontSize: "0.9rem" }}>
                SUBMIT BESPOKE INQUIRY →
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
