"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_SHORT } from "@/lib/site";
import { optimized } from "@/lib/images";

/* The countries this company actually sells, from its own destination list. */
const DESTINATIONS = [
  "Vietnam", "Cambodia", "Laos", "Thailand", "Myanmar", "Malaysia", "Singapore",
  "Indonesia / Bali", "Philippines", "Japan", "China", "South Korea", "Taiwan",
  "India", "Nepal", "Bhutan", "Sri Lanka", "Maldives", "Tibet", "Not sure yet",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* Five years ahead: long-haul private travel is booked well in advance. */
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + i));

const BUDGETS = [
  "Under $5,000",
  "$5,000 - $10,000",
  "$10,000 - $20,000",
  "$20,000 - $40,000",
  "$40,000 - $75,000",
  "Over $75,000",
  "Not sure yet",
];

/* The markets this company sells into, then the rest alphabetically. */
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "New Zealand",
  "Ireland", "Germany", "France", "Netherlands", "Belgium", "Switzerland",
  "Austria", "Spain", "Italy", "Sweden", "Norway", "Denmark", "Finland",
  "Singapore", "Hong Kong", "Japan", "South Korea", "United Arab Emirates",
  "South Africa", "Brazil", "Mexico", "Other",
];

/** Repeaters arrive as JSON strings when ACF free is in play. */
function safeParse(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

export default function PlanTripTemplateV2({
  data,
  homeData,
  fallbackImage = "",
}: {
  data?: any;
  homeData?: any;
  fallbackImage?: string;
}) {
  const heroBg = data?.featuredMedia?.url || fallbackImage;

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    isAdvisor: false,
    email: "",
    country: "",
    dialCode: "",
    phone: "",
    destinations: [] as string[],
    startMonth: "",
    startYear: "",
    nights: "",
    budget: "",
    travelers: "",
    notes: "",
    newsletter: false,
    company: "",
  });

  const set = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const setBool = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.checked }));

  /* The enquiry goes to the office. The previous handler set a flag and threw
     the submission away, so every message sent from this page was lost. */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);

    try {
      const response = await /* Trailing slash: the site redirects without it, and a 308 on every
         submission is a wasted round trip. */
      fetch("/api/leads/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: [form.dialCode, form.phone].filter(Boolean).join(" ").trim(),
          destination: form.destinations.join(", "),
          message: form.notes,
          sourcePath: window.location.pathname,
          company: form.company,
          details: {
            "Home country": form.country,
            "Travel advisor": form.isAdvisor ? "Yes" : "No",
            "Start date": [form.startMonth, form.startYear].filter(Boolean).join(" "),
            "Trip length": form.nights ? `${form.nights} nights` : "",
            "Total budget": form.budget,
            "Number of travellers": form.travelers,
            Newsletter: form.newsletter ? "Yes" : "No",
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Something went wrong. Please try again, or email us directly.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  /* Reviews data aligned with Homepage */
  const acf = homeData?.acf || data?.acf || {};
  const parsedReviews = safeParse(acf.testimonials);
  /* Four invented reviews used to stand in here - named couples with dates
     and itineraries, printed as real customer quotes whenever WordPress held
     none. The section hides instead, the way every other section on this site
     does when it has no data. */
  const testimonials = parsedReviews;
  const reviewSummary = typeof acf.review_summary === "string" ? acf.review_summary : "";
  const reviewLogo = typeof acf.review_logo === "string" ? acf.review_logo : "";
  const reviewLink = typeof acf.review_link === "string" ? acf.review_link : "";
  const reviewText = typeof acf.review_text === "string" ? acf.review_text : "";

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

      {/* ═══ ENQUIRY FORM ═══
          What the office actually needs to open a conversation, in the order
          a traveller can answer it: who you are, then where and when. The
          previous version asked eighteen questions across six numbered steps
          and, having asked them, posted nowhere - `handleSubmit` set a flag
          and the enquiry was gone. */}
      <section id="form" className="section on-white">
        <div className="container">
          {submitted ? (
            <div className="enquiry-done">
              <p className="eyebrow" style={{ justifyContent: "center" }}>
                <em>Enquiry</em> Received
              </p>
              <h2>Thank you{form.firstName ? `, ${form.firstName}` : ""}</h2>
              <p>
                A private travel designer will read this and reply within one business day.
                Nothing is booked and nothing is charged.
              </p>
              {String(acf.phone || "") && (
                <p className="enquiry-call">
                  Need to speak sooner? <strong>{String(acf.phone)}</strong>
                </p>
              )}
              <Link href="/" className="btn btn-line-ink">
                Return home
              </Link>
            </div>
          ) : (
            <>
              <p className="enquiry-lede">
                Please fill out the information below or speak to your travel advisor.
                Required fields are marked with an asterisk (*).
              </p>

              <form className="enquiry" onSubmit={handleSubmit} noValidate={false}>
                {/* Honeypot: hidden from people, filled by bots. */}
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={set("company")}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="enquiry-trap"
                />

                <div className="enquiry-col">
                  <div className="enquiry-row">
                    <label htmlFor="firstName">First Name <span aria-hidden="true">*</span></label>
                    <input id="firstName" name="firstName" required value={form.firstName} onChange={set("firstName")} autoComplete="given-name" />
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="lastName">Last Name <span aria-hidden="true">*</span></label>
                    <input id="lastName" name="lastName" required value={form.lastName} onChange={set("lastName")} autoComplete="family-name" />
                  </div>

                  <div className="enquiry-row">
                    <span />
                    <label className="enquiry-toggle">
                      <input type="checkbox" checked={form.isAdvisor} onChange={setBool("isAdvisor")} />
                      <span className="enquiry-switch" aria-hidden="true" />
                      I am a travel advisor
                    </label>
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="email">Email <span aria-hidden="true">*</span></label>
                    <input id="email" name="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="country">Home Country <span aria-hidden="true">*</span></label>
                    <select id="country" name="country" required value={form.country} onChange={set("country")} autoComplete="country-name">
                      <option value="">Your Country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="phone">Phone <span aria-hidden="true">*</span></label>
                    <div className="enquiry-phone">
                      <input
                        id="dialCode"
                        name="dialCode"
                        value={form.dialCode}
                        onChange={set("dialCode")}
                        placeholder="+1"
                        aria-label="Country dialling code"
                        inputMode="tel"
                      />
                      <input id="phone" name="phone" required value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" />
                    </div>
                  </div>
                </div>

                <div className="enquiry-col">
                  <div className="enquiry-row">
                    <span id="destinations-label" className="enquiry-label">Desired Destinations</span>
                    {/* Was a <select multiple>. Two problems with that: it paints the
                        selected row in the operating system's blue, which is the one
                        colour on the page nobody chose, and it hides the fact that
                        more than one country can be picked behind a ctrl-click
                        nobody discovers. Checkboxes say both things out loud. */}
                    <div className="enquiry-chips" role="group" aria-labelledby="destinations-label">
                      {DESTINATIONS.map((d) => {
                        const on = form.destinations.includes(d);
                        return (
                          <label key={d} className={`enquiry-chip${on ? " is-on" : ""}`}>
                            <input
                              type="checkbox"
                              name="destinations"
                              value={d}
                              checked={on}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  destinations: on
                                    ? prev.destinations.filter((x) => x !== d)
                                    : [...prev.destinations, d],
                                }))
                              }
                            />
                            {d}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="startMonth">Start Date</label>
                    <div className="enquiry-pair">
                      <select id="startMonth" name="startMonth" value={form.startMonth} onChange={set("startMonth")}>
                        <option value="">Month</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select id="startYear" name="startYear" value={form.startYear} onChange={set("startYear")}>
                        <option value="">Year</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="nights">Trip Length</label>
                    <input
                      id="nights"
                      name="nights"
                      type="number"
                      min={1}
                      max={120}
                      value={form.nights}
                      onChange={set("nights")}
                      placeholder="Number of Nights in Asia"
                    />
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="budget">Total Budget for All Travelers <span aria-hidden="true">*</span></label>
                    <select id="budget" name="budget" required value={form.budget} onChange={set("budget")}>
                      <option value="">All Prices are in USD</option>
                      {BUDGETS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="travelers">Number of Travelers</label>
                    <input
                      id="travelers"
                      name="travelers"
                      type="number"
                      min={1}
                      max={40}
                      value={form.travelers}
                      onChange={set("travelers")}
                      placeholder="Number of Travelers"
                    />
                  </div>

                  <div className="enquiry-row">
                    <label htmlFor="notes">Enquiry Details</label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={6}
                      value={form.notes}
                      onChange={set("notes")}
                      placeholder="Tell us about your interests, passions, needs, and any other details relevant to your trip."
                    />
                  </div>

                  <div className="enquiry-row">
                    <span />
                    <label className="enquiry-toggle">
                      <input type="checkbox" checked={form.newsletter} onChange={setBool("newsletter")} />
                      <span className="enquiry-switch" aria-hidden="true" />
                      Subscribe to newsletter
                    </label>
                  </div>

                  <div className="enquiry-row enquiry-actions">
                    <span />
                    <div>
                      {error && <p className="enquiry-error" role="alert">{error}</p>}
                      <button type="submit" className="btn btn-line-ink" disabled={sending}>
                        {sending ? "Sending…" : "Enquire"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ═══ REVIEWS & TRUST SECTION (ALIGNED WITH HOMEPAGE) ═══ */}
      {testimonials.length > 0 && (
        <section className="section on-white" id="reviews" style={{ borderTop: "1px solid var(--line-on-cream)" }}>
          <div className="container">
            <div className="center reveal">
              <p className="eyebrow">
                <em>What</em> Travelers Say
              </p>
              {reviewSummary && (
                <div style={{ marginTop: "0.6rem" }} dangerouslySetInnerHTML={{ __html: reviewSummary }} />
              )}
              {reviewLink && (
                <a
                  href={reviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-arrow"
                  style={{ marginTop: "0.4rem", display: "inline-flex" }}
                >
                  {reviewLogo && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={optimized(reviewLogo, "thumb")}
                      alt={reviewText || "TripAdvisor"}
                      style={{ height: "20px", marginRight: "8px" }}
                    />
                  )}
                  {reviewText || "Read reviews on TripAdvisor"}
                </a>
              )}
            </div>

            <div className="card-grid reveal" style={{ marginTop: "2.4rem" }}>
              {testimonials.slice(0, 6).map((item: any, idx: number) => (
                <div className="review-card" key={idx}>
                  {item.vote && (
                    <p className="review-stars" aria-label={`${item.vote} out of 5`}>
                      {"★".repeat(Math.min(5, Number(item.vote) || 5))}
                    </p>
                  )}
                  <p className="review-quote">“{String(item.content || "").replace(/<[^>]+>/g, "").slice(0, 260)}”</p>
                  <div className="review-by">
                    {item.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        className="review-avatar"
                        src={optimized(String(item.avatar), "thumb")}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="review-avatar is-empty" aria-hidden="true">
                        {String(item.user_name || "?").trim().charAt(0)}
                      </span>
                    )}
                    <span>
                      <strong>{String(item.user_name || "")}</strong>
                      {item.date && <em>{String(item.date)}</em>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 4 Pillars of Excellence (Clean, Luxury & Minimalist without Emojis) */}
            <div
              style={{
                marginTop: "4rem",
                paddingTop: "3rem",
                borderTop: "1px solid var(--line-on-cream)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "2.4rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 700 }}>
                  01 / BESPOKE
                </span>
                <h4 style={{ fontSize: "1.05rem", margin: "0.5rem 0 0.4rem", color: "var(--ink)", fontFamily: "'Playfair Display', serif" }}>
                  100% Private Journeys
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6, margin: 0 }}>
                  Every day, route, and hotel curated exclusively for your personal pace and party.
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 700 }}>
                  02 / ACCESS
                </span>
                <h4 style={{ fontSize: "1.05rem", margin: "0.5rem 0 0.4rem", color: "var(--ink)", fontFamily: "'Playfair Display', serif" }}>
                  Privileged VIP Entrées
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6, margin: 0 }}>
                  Private monastery blessings, after-hours temple access, and top regional specialists.
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 700 }}>
                  03 / SERVICE
                </span>
                <h4 style={{ fontSize: "1.05rem", margin: "0.5rem 0 0.4rem", color: "var(--ink)", fontFamily: "'Playfair Display', serif" }}>
                  24/7 Ground Concierge
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6, margin: 0 }}>
                  Immediate local assistance from our regional offices throughout Southeast &amp; East Asia.
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--rust)", fontWeight: 700 }}>
                  04 / LUXURY
                </span>
                <h4 style={{ fontSize: "1.05rem", margin: "0.5rem 0 0.4rem", color: "var(--ink)", fontFamily: "'Playfair Display', serif" }}>
                  Preferred Hotel Perks
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim-on-cream)", lineHeight: 1.6, margin: 0 }}>
                  Complimentary room upgrades, daily breakfast, and resort credits for our travelers.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
