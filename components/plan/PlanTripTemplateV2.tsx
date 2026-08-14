"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_NAME, BRAND_SHORT } from "@/lib/site";
import { optimized } from "@/lib/images";

const ALL_DESTINATIONS = [
  "Vietnam",
  "Thailand",
  "Cambodia",
  "Laos",
  "Japan",
  "Bhutan",
  "Bali & Indonesia",
  "Myanmar",
  "Sri Lanka",
  "India",
  "Nepal",
  "Singapore",
  "South Korea",
  "Maldives",
  "Taiwan",
  "China",
];

const TRAVEL_EXPERIENCES = [
  { id: "culture", label: "🏛️ Ancient Temples & Culture" },
  { id: "culinary", label: "🍜 Gourmet Dining & Street Food Trails" },
  { id: "nature", label: "🌿 Pristine Nature & Wildlife" },
  { id: "wellness", label: "🧘 Spa, Yoga & Holistic Wellness" },
  { id: "beach", label: "🏖️ Private Beaches & Island Escapes" },
  { id: "arts", label: "🎨 Local Arts, Crafts & Traditions" },
  { id: "cruise", label: "⛵ Private Yacht & River Cruises" },
  { id: "adventure", label: "🚶 Light Trekking & Adventure" },
];

const REVIEWS = [
  {
    name: "Eleanor & David Thornton",
    location: "New York, NY",
    tour: "14-Day Grand Indochina (Vietnam & Cambodia)",
    date: "Travelled March 2026",
    stars: 5,
    quote:
      "Absolute Asia planned our 25th anniversary to Vietnam and Cambodia. Every private guide was deeply knowledgeable, the Aman and Belmond accommodations were sublime, and the private sunrise tour of Angkor Wat with zero crowds was the highlight of our lives.",
  },
  {
    name: "Sir Julian & Lady Mercer",
    location: "London, United Kingdom",
    tour: "12-Day Hidden Kingdoms of Bhutan & Nepal",
    date: "Travelled November 2025",
    stars: 5,
    quote:
      "The attention to detail is unmatched. Having a private luxury car, seamless airport escorts at every stop, and dining in private monastery gardens made this our most effortless and awe-inspiring journey to date.",
  },
  {
    name: "Dr. Marcus Vance & Family",
    location: "San Francisco, CA",
    tour: "16-Day Japan & Thailand Heritage",
    date: "Travelled January 2026",
    stars: 5,
    quote:
      "Traveling with two teenagers can be challenging, but our travel designer crafted an itinerary that kept everyone enchanted — from tea masters in Kyoto to private elephant sanctuaries in Chiang Mai. 10/10 service.",
  },
  {
    name: "Claire & Thomas Dubois",
    location: "Geneva, Switzerland",
    tour: "10-Day Private Bali & Komodo Voyage",
    date: "Travelled February 2026",
    stars: 5,
    quote:
      "From our private yacht charter in Komodo to cliffside dinners at Nihi Sumba, Absolute Asia delivered sheer perfection. Their 24/7 on-the-ground concierge resolved our last-minute helicopter transfer without a hitch.",
  },
];

export default function PlanTripTemplateV2({ data, fallbackImage = "" }: { data?: any; fallbackImage?: string }) {
  const heroBg = data?.featuredMedia?.url || fallbackImage;
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    destinations: ["Vietnam"],
    timeframe: "Autumn 2026",
    duration: "10 - 14 Days",
    travelers: "2 Adults (Couple)",
    childrenCount: "No Children",
    occasion: "Vacation & Leisure",
    budget: "$8,000 - $12,000 pp",
    hotelStyle: "5-Star Luxury & Boutique",
    interests: ["culture", "culinary"],
    name: "",
    email: "",
    phone: "",
    country: "",
    contactPreference: "Email",
    bestTimeToCall: "Morning",
    notes: "",
  });

  const toggleDestination = (dest: string) => {
    setFormData((prev) => {
      const exists = prev.destinations.includes(dest);
      return {
        ...prev,
        destinations: exists
          ? prev.destinations.filter((d) => d !== dest)
          : [...prev.destinations, dest],
      };
    });
  };

  const toggleInterest = (id: string) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(id);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((i) => i !== id)
          : [...prev.interests, id],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section
        id="hero"
        style={{
          position: "relative",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          overflow: "hidden",
          backgroundColor: "var(--ink)",
          ...(heroBg ? { backgroundImage: `url(${optimized(heroBg, "hero")})` } : {}),
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.82) 60%, rgba(14,20,28,0.98) 100%)",
            zIndex: 1,
          }}
        />

        <div
          className="container"
          style={{ position: "relative", zIndex: 2, paddingBottom: "3.5rem", paddingTop: "6.5rem" }}
        >
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>
              {BRAND_SHORT}
            </Link>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>
              Tailor-Made Inquiry
            </span>
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              color: "#E2C38E",
              fontSize: "0.78rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: "0.8rem",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Bespoke Journey Consultation"}</span>
          </div>

          <h1
            style={{
              color: "var(--white)",
              fontSize: "clamp(2.4rem,5vw,4.2rem)",
              lineHeight: 1.05,
              maxWidth: "20ch",
              fontWeight: 400,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || (
                <>
                  Start Planning Your{" "}
                  <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>
                    Private Journey
                  </em>
                </>
              )
            )}
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: "clamp(1.02rem,1.4vw,1.18rem)",
              maxWidth: "58ch",
              marginTop: "1rem",
              fontWeight: 400,
              lineHeight: 1.65,
              textShadow: "0 1px 6px rgba(0,0,0,0.6)",
            }}
          >
            {data?.acf?.page_description ||
              data?.excerpt ||
              "Every itinerary is handcrafted from scratch around your rhythm and passions. Share your travel ideas below, and a senior Asia specialist will design your bespoke proposal within 24 hours."}
          </p>
        </div>
      </section>

      {/* ═══ FORM SECTION ═══ */}
      <section id="form" className="section on-cream" style={{ background: "var(--cream)", paddingTop: "3rem" }}>
        <div className="container" style={{ maxWidth: "920px" }}>
          {submitted ? (
            <div
              style={{
                background: "var(--white)",
                padding: "clamp(3rem,6vw,4.5rem) clamp(2rem,4vw,3.5rem)",
                borderRadius: "4px",
                border: "1px solid var(--line-on-cream)",
                textAlign: "center",
                boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 1.5rem",
                  background: "rgba(72,98,79,0.12)",
                  color: "var(--rust)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                }}
              >
                ✓
              </div>
              <p className="eyebrow" style={{ justifyContent: "center" }}>
                <em>Inquiry</em> Received
              </p>
              <h2 style={{ fontSize: "2.2rem", fontFamily: "'Playfair Display', serif", marginTop: "0.6rem" }}>
                Thank You, {formData.name || "Traveler"}
              </h2>
              <p
                style={{
                  color: "var(--text-dim-on-cream)",
                  marginTop: "1rem",
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  maxWidth: "52ch",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                Your custom travel request for <strong>{formData.destinations.join(", ") || "Asia"}</strong> has been
                routed to our senior destination designer. We will review your preferences and deliver your personalized
                draft itinerary within one business day.
              </p>
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.2rem",
                  background: "var(--cream)",
                  borderRadius: "4px",
                  display: "inline-block",
                  fontSize: "0.9rem",
                  color: "var(--ink)",
                }}
              >
                Need urgent assistance? Call us directly: <strong>+1 (800) 736-8187</strong>
              </div>
              <div style={{ marginTop: "2.4rem" }}>
                <Link href="/" className="btn btn-fill-ink">
                  Return to Homepage
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                background: "var(--white)",
                padding: "clamp(2rem,4vw,3.5rem)",
                borderRadius: "4px",
                border: "1px solid var(--line-on-cream)",
                boxShadow: "0 14px 45px rgba(0,0,0,0.06)",
              }}
            >
              <div className="center" style={{ marginBottom: "2.5rem" }}>
                <p className="eyebrow" style={{ justifyContent: "center" }}>
                  <em>Tailor-Made</em> Request
                </p>
                <h2 style={{ fontSize: "clamp(1.6rem,2.8vw,2.2rem)", marginTop: "0.4rem" }}>
                  Start Planning Your Private Journey
                </h2>
                <p style={{ color: "var(--text-dim-on-cream)", fontSize: "0.92rem", marginTop: "0.5rem" }}>
                  Private · Custom-Crafted · 100% Obligation-Free
                </p>
              </div>

              {/* ─── SECTION 1: DESTINATIONS ─── */}
              <div style={{ marginBottom: "2.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.8rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    1. Which destinations would you like to visit? *
                  </label>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim-on-cream)" }}>Select all that apply</span>
                </div>

                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {ALL_DESTINATIONS.map((dest) => {
                    const isSelected = formData.destinations.includes(dest);
                    return (
                      <button
                        type="button"
                        key={dest}
                        onClick={() => toggleDestination(dest)}
                        style={{
                          padding: "0.55rem 1.1rem",
                          fontSize: "0.85rem",
                          borderRadius: "2px",
                          border: isSelected ? "2px solid var(--rust)" : "1px solid var(--line-on-cream)",
                          background: isSelected ? "rgba(72,98,79,0.09)" : "var(--cream)",
                          color: isSelected ? "var(--rust)" : "var(--ink)",
                          fontWeight: isSelected ? 600 : 400,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {dest} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── SECTION 2: TIMING & TRAVELERS ─── */}
              <div style={{ marginBottom: "2.4rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: "1rem",
                  }}
                >
                  2. Travel Timing &amp; Party Details
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1.4rem",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Estimated Travel Dates / Season
                    </label>
                    <select
                      value={formData.timeframe}
                      onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.8rem 0.9rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option>Autumn 2026 (Sep – Nov)</option>
                      <option>Winter 2026 / 2027 (Dec – Feb)</option>
                      <option>Spring 2027 (Mar – May)</option>
                      <option>Summer 2027 (Jun – Aug)</option>
                      <option>Late 2027 or 2028</option>
                      <option>Flexible / Ready Anytime</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Trip Duration
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.8rem 0.9rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option>7 - 10 Days</option>
                      <option>10 - 14 Days</option>
                      <option>14 - 21 Days</option>
                      <option>21 - 28 Days</option>
                      <option>1 Month+ (Grand Asian Expedition)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Adult Travelers
                    </label>
                    <select
                      value={formData.travelers}
                      onChange={(e) => setFormData({ ...formData, travelers: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.8rem 0.9rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option>Solo Traveler (1 Adult)</option>
                      <option>2 Adults (Couple / Partners)</option>
                      <option>2 Adults (Twin / Friends)</option>
                      <option>3 - 4 Adults (Family / Group)</option>
                      <option>5 - 8 Adults (Private Group)</option>
                      <option>9+ Adults (Multi-Gen Group)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Children / Minors
                    </label>
                    <select
                      value={formData.childrenCount}
                      onChange={(e) => setFormData({ ...formData, childrenCount: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.8rem 0.9rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option>No Children</option>
                      <option>1 Child (under 12)</option>
                      <option>2 Children (under 12)</option>
                      <option>3+ Children</option>
                      <option>Teenagers (12 - 17)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ─── SECTION 3: BUDGET & ACCOMMODATION ─── */}
              <div style={{ marginBottom: "2.4rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: "1rem",
                  }}
                >
                  3. Accommodation &amp; Investment Tier (Excl. Intl. Flights)
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Estimated Budget Per Person
                    </label>
                    <select
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.8rem 0.9rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option>$5,000 – $8,000 pp</option>
                      <option>$8,000 – $12,000 pp</option>
                      <option>$12,000 – $18,000 pp</option>
                      <option>$18,000+ pp (Ultra-Luxury / Private Jet / Villas)</option>
                      <option>Flexible / Advise Me on Best Value</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Preferred Hotel Style
                    </label>
                    <select
                      value={formData.hotelStyle}
                      onChange={(e) => setFormData({ ...formData, hotelStyle: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.8rem 0.9rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option>5-Star Luxury &amp; Boutique (Rosewood, Capella, Four Seasons)</option>
                      <option>Ultra-Luxury &amp; Private Sanctuaries (Aman, Six Senses, Soneva)</option>
                      <option>Authentic Heritage &amp; Historic Palaces</option>
                      <option>Eco-Luxe Nature Lodges &amp; Overwater Pavilions</option>
                      <option>Mix of Classic Luxury &amp; Characterful Stays</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ─── SECTION 4: INTERESTS & PASSIONS ─── */}
              <div style={{ marginBottom: "2.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.8rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    4. Signature Experiences &amp; Travel Passions
                  </label>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim-on-cream)" }}>Optional</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>
                  {TRAVEL_EXPERIENCES.map((exp) => {
                    const isSelected = formData.interests.includes(exp.id);
                    return (
                      <button
                        type="button"
                        key={exp.id}
                        onClick={() => toggleInterest(exp.id)}
                        style={{
                          padding: "0.65rem 0.85rem",
                          fontSize: "0.82rem",
                          textAlign: "left",
                          borderRadius: "2px",
                          border: isSelected ? "2px solid var(--rust)" : "1px solid var(--line-on-cream)",
                          background: isSelected ? "rgba(72,98,79,0.09)" : "var(--cream)",
                          color: isSelected ? "var(--rust)" : "var(--ink)",
                          fontWeight: isSelected ? 600 : 400,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {exp.label} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── SECTION 5: CONTACT INFORMATION ─── */}
              <div style={{ marginBottom: "2.4rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: "1rem",
                  }}
                >
                  5. Your Contact Information
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem", marginBottom: "1.2rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="eleanor@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Phone / WhatsApp (with country code) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (212) 627-1950"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>
                      Country / City of Residence
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New York, USA"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        border: "1px solid var(--line-on-cream)",
                        borderRadius: "2px",
                        background: "var(--cream)",
                        color: "var(--ink)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ─── SECTION 6: SPECIAL WISHES ─── */}
              <div style={{ marginBottom: "2.4rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: "0.5rem",
                  }}
                >
                  6. Special Wishes, Celebration &amp; Itinerary Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about specific sights on your bucket list, celebratory occasions (Honeymoon, Anniversary), physical pace, dietary preferences, or flights already booked..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    border: "1px solid var(--line-on-cream)",
                    borderRadius: "2px",
                    background: "var(--cream)",
                    color: "var(--ink)",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* ─── SUBMIT BUTTON ─── */}
              <button
                type="submit"
                className="btn btn-fill-ink"
                style={{
                  width: "100%",
                  padding: "1.2rem",
                  fontSize: "0.95rem",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  cursor: "pointer",
                }}
              >
                SUBMIT BESPOKE INQUIRY <span>→</span>
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1.8rem",
                  marginTop: "1.5rem",
                  fontSize: "0.78rem",
                  color: "var(--text-dim-on-cream)",
                  flexWrap: "wrap",
                }}
              >
                <span>🔒 100% Privacy Protected</span>
                <span>⚡ 24-Hour Response Guarantee</span>
                <span>✨ Zero Commitment Required</span>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ═══ REVIEWS & TRUST SECTION (WHAT TRAVELERS SAY) ═══ */}
      <section className="section on-white" id="traveler-reviews" style={{ borderTop: "1px solid var(--line-on-cream)" }}>
        <div className="container">
          <div className="center reveal" style={{ maxWidth: "720px", margin: "0 auto 3rem" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <em>Traveler</em> Stories &amp; Acclaim
            </p>
            <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", marginTop: "0.5rem" }}>
              Unrivaled Experiences, Remembered for a Lifetime
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.8rem",
                marginTop: "1rem",
                padding: "0.5rem 1.2rem",
                background: "var(--cream)",
                borderRadius: "30px",
                border: "1px solid var(--line-on-cream)",
              }}
            >
              <span style={{ color: "var(--gold)", fontSize: "1rem" }}>★★★★★</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}>
                5.0 Rating · Over 1,200+ Discerning Travelers Guided
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.8rem",
            }}
          >
            {REVIEWS.map((review, idx) => (
              <div className="review-card" key={idx} style={{ height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="review-stars" aria-label="5 out of 5 stars">
                    {"★".repeat(review.stars)}
                  </p>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--rust)",
                      fontWeight: 600,
                      background: "rgba(72,98,79,0.08)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "2px",
                    }}
                  >
                    Verified Guest
                  </span>
                </div>
                <p className="review-quote" style={{ WebkitLineClamp: 7, fontSize: "0.92rem", lineHeight: 1.7 }}>
                  “{review.quote}”
                </p>
                <div className="review-by" style={{ marginTop: "auto" }}>
                  <span className="review-avatar is-empty" aria-hidden="true">
                    {review.name.charAt(0)}
                  </span>
                  <div>
                    <strong>{review.name}</strong>
                    <em>
                      {review.location} · {review.tour}
                    </em>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4 Pillars of Trust */}
          <div
            style={{
              marginTop: "4rem",
              paddingTop: "3rem",
              borderTop: "1px solid var(--line-on-cream)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "2rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "1.8rem" }}>💎</span>
              <h4 style={{ fontSize: "0.95rem", margin: "0.6rem 0 0.3rem", color: "var(--ink)" }}>100% Private &amp; Bespoke</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6 }}>
                Every day, route, and hotel curated exclusively for your travel party.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "1.8rem" }}>👑</span>
              <h4 style={{ fontSize: "0.95rem", margin: "0.6rem 0 0.3rem", color: "var(--ink)" }}>Privileged VIP Access</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6 }}>
                Private monastery blessings, after-hours temple entries &amp; top local guides.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "1.8rem" }}>🛎️</span>
              <h4 style={{ fontSize: "0.95rem", margin: "0.6rem 0 0.3rem", color: "var(--ink)" }}>24/7 On-the-Ground Concierge</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6 }}>
                Immediate local assistance from our regional offices throughout Asia.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "1.8rem" }}>🛡️</span>
              <h4 style={{ fontSize: "0.95rem", margin: "0.6rem 0 0.3rem", color: "var(--ink)" }}>Virtuoso &amp; Top Hotel Perks</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6 }}>
                Complimentary room upgrades, daily breakfast, and resort credits for our guests.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
