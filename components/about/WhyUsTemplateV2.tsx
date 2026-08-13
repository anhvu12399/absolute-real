"use client";

import Link from "next/link";
import type { ArchiveItem } from "@/lib/wp";
import { BRAND_SHORT } from "@/lib/site";
import { bg, optimized } from "@/lib/images";

type TeamMember = { photo?: string; name?: string; role?: string; bio?: string };
type Milestone = { year?: string; title?: string; text?: string };
type Pillar = { kicker?: string; title?: string; text?: string };

export default function WhyUsTemplateV2({ data, gallery = [] }: { data?: any; gallery?: ArchiveItem[] }) {
  /* Repeaters arrive as JSON strings when ACF free is in play. */
  const parseRows = (value: unknown): TeamMember[] => {
    if (Array.isArray(value)) return value as TeamMember[];
    if (typeof value === "string" && value.trim().startsWith("[")) {
      try { return JSON.parse(value) as TeamMember[]; } catch { return []; }
    }
    return [];
  };
  const team = parseRows(data?.acf?.team).filter((m) => m?.name);
  const acf = (data?.acf || {}) as Record<string, unknown>;
  const str = (key: string) => (typeof acf[key] === "string" ? (acf[key] as string).trim() : "");

  const storyEyebrow = str("story_eyebrow");
  const storyHeadline = str("story_headline");
  const storyLede = str("story_lede");
  const storyNowTitle = str("story_now_title");
  const storyNowText = str("story_now_text");
  const founderName = str("story_founder_name");
  const founderRole = str("story_founder_role");
  const founderPhoto = str("story_founder_photo");
  const founderQuote = str("story_founder_quote");
  const milestones = parseRows(acf.story_milestones) as unknown as Milestone[];
  const pillars = parseRows(acf.pillars) as unknown as Pillar[];
  const pillarsTitle = str("pillars_title");
  const teamTitle = String(data?.acf?.team_title || "The specialists who plan your journey");
  /* No stock photography: this page's own featured image, or one of the
     journeys it describes. */
  const heroBg = data?.featuredMedia?.url || gallery[0]?.featuredMedia?.url || "";
  /* The number here has to be the number that answers. It comes from the same
     field the rest of the site dials, not from the template. */
  const phone = String(data?.acf?.specialist_phone || "(+1) 315 998 1998").trim();
  const tel = `tel:+${phone.replace(/\D/g, "")}`;
  const plates = gallery.filter((item) => item.featuredMedia?.url).slice(1, 5);
  return (
    <>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section id="hero" style={{ position: "relative", minHeight: "75vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "var(--ink)", ...(heroBg ? { backgroundImage: `url(${optimized(heroBg, "hero")})` } : {}), backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,20,28,0.45) 0%, rgba(14,20,28,0.8) 60%, rgba(14,20,28,0.96) 100%)", zIndex: 1 }} />

        <div className="container" style={{ position: "relative", zIndex: 2, paddingBottom: "4rem", paddingTop: "8rem" }}>
          <p className="crumb" style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1.2rem" }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.9)" }}>{BRAND_SHORT}</Link><span style={{ color: "rgba(255,255,255,0.6)" }}>/</span>
            <span className="current" style={{ color: "var(--celadon-pale)" }}>Why Us</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#E2C38E", fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.8rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: "26px", height: "2px", background: "#E2C38E" }} />
            <span>{data?.acf?.eyebrow || "Two Decades of Excellence"}</span>
          </div>

          <h1 style={{ color: "var(--white)", fontSize: "clamp(2.6rem,5.8vw,4.8rem)", lineHeight: 1.04, maxWidth: "18ch", fontWeight: 400, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {data?.acf?.hero_tagline ? (
              <span dangerouslySetInnerHTML={{ __html: data.acf.hero_tagline }} />
            ) : (
              data?.title || <>Why <em style={{ fontStyle: "italic", fontFamily: "'Playfair Display', serif", color: "#F0E6D2" }}>{BRAND_SHORT}</em></>
            )}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "clamp(1.05rem,1.6vw,1.25rem)", maxWidth: "56ch", marginTop: "1.2rem", fontWeight: 400, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            {data?.acf?.page_description || data?.excerpt || "We compose private, tailor-made luxury journeys with zero compromises — supported by expert local guides and 24/7 concierge support."}
          </p>
        </div>
      </section>

      {/* ═══ THE STORY ═══
          A real history, set as one: the opening claim, a dated rail of
          milestones, and the founder's line. Every field comes from WordPress
          (Pages → About Us → Our Story), seeded from the legacy copy — so this
          section disappears entirely on a site that has not filled it in. */}
      {(storyHeadline || milestones.length > 0) && (
        <section id="story" className="section on-cream story">
          <div className="container">
            <div className="story-open reveal">
              {storyEyebrow && <p className="eyebrow"><em>{storyEyebrow.split(" ")[0]}</em> {storyEyebrow.split(" ").slice(1).join(" ")}</p>}
              {storyHeadline && <h2 className="story-headline">{storyHeadline}</h2>}
              {storyLede && <p className="story-lede">{storyLede}</p>}
            </div>

            {milestones.length > 0 && (
              <ol className="story-rail reveal">
                {milestones.map((m: Milestone, idx: number) => (
                  <li key={idx}>
                    <span className="story-year">{m.year}</span>
                    <div>
                      {m.title && <h3>{m.title}</h3>}
                      {m.text && <p>{m.text}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {(founderQuote || storyNowText) && (
              <div className="story-close reveal">
                {founderQuote && (
                  <figure className="story-quote">
                    {founderPhoto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img className="story-founder-photo" src={optimized(founderPhoto, "card")} alt={founderName} loading="lazy" />
                    ) : null}
                    <blockquote>“{founderQuote}”</blockquote>
                    {founderName && (
                      <figcaption>
                        <strong>{founderName}</strong>
                        {founderRole && <em>{founderRole}</em>}
                      </figcaption>
                    )}
                  </figure>
                )}
                {storyNowText && (
                  <div className="story-now">
                    {storyNowTitle && <h3>{storyNowTitle}</h3>}
                    <p>{storyNowText}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ WORDPRESS BODY ═══ */}
      {data?.content && (
        <section className="section on-white">
          <div className="container" style={{ maxWidth: "840px" }}>
            <div className="wordpress-content" dangerouslySetInnerHTML={{ __html: data.content }} />
          </div>
        </section>
      )}

      {/* ═══ WHAT THE WORK LOOKS LIKE ═══
          The page carries one photograph of its own; these are real journeys
          from the catalogue rather than stock, and each one links to itself. */}
      {plates.length > 0 && (
        <section className="section on-white">
          <div className="container">
            <div className="center">
              <p className="eyebrow"><em>Recent</em> Journeys</p>
            </div>
            <div className="card-grid" style={{ marginTop: "2.5rem" }}>
              {plates.map((item) => (
                <Link key={item.id} href={item.path} className="offer-card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="offer-photo ph" style={bg(item.featuredMedia!.url, "card")} />
                  <h3>{item.title}</h3>
                  {item.duration && <p className="offer-meta">{item.duration}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ GUARANTEES ═══
          Four fixed English paragraphs used to live here, including a review
          count only the client can stand behind. They are WordPress fields now
          (Pages → About Us → Guarantees) — seeded with this wording, editable,
          and absent entirely on a site that has not filled them in. */}
      {pillars.length > 0 && (
        <section id="pillars" className="section on-cream" style={{ background: "var(--cream)" }}>
          <div className="container">
            <div className="center">
              <p className="eyebrow"><em>Our</em> Guarantees</p>
              {pillarsTitle && <h2 style={{ fontSize: "clamp(1.8rem,3.2vw,2.5rem)" }}>{pillarsTitle}</h2>}
            </div>

            <div className="pillar-grid">
              {pillars.map((pillar: Pillar, idx: number) => (
                <article className="pillar-card" key={idx}>
                  {pillar.kicker && <span className="pillar-kicker">{pillar.kicker}</span>}
                  {pillar.title && <h3>{pillar.title}</h3>}
                  {pillar.text && <p>{pillar.text}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ THE PEOPLE ═══
          Filled from WordPress (Pages → About Us → Team). No team, no section -
          rather than stock portraits of people who do not work here. */}
      {team.length > 0 && (
        <section id="team" className="section on-white">
          <div className="container">
            <div className="center">
              <p className="eyebrow" style={{ justifyContent: "center" }}><em>The</em> People</p>
              <h2 style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>{teamTitle}</h2>
            </div>
            <div className="team-grid">
              {team.map((member: TeamMember, idx: number) => (
                <article className="team-card" key={idx}>
                  {member.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img className="team-photo" src={optimized(member.photo, "card")} alt={member.name || ""} loading="lazy" />
                  ) : (
                    <span className="team-photo is-empty" aria-hidden="true">
                      {String(member.name || "?").trim().charAt(0)}
                    </span>
                  )}
                  <h3>{member.name}</h3>
                  {member.role && <p className="team-role">{member.role}</p>}
                  {member.bio && <p className="team-bio">{member.bio}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CTA ═══ */}
      <section className="section on-ink">
        <div className="container center">
          <p className="eyebrow" style={{ justifyContent: "center" }}><em>Connect</em> With Us</p>
          <h2 style={{ color: "var(--white)", fontSize: "clamp(1.7rem,3vw,2.3rem)" }}>Speak with an Asia Specialist</h2>
          <p style={{ marginTop: "1rem", color: "var(--text-dim-on-ink)" }}>
            Call us directly at <a href={tel} style={{ color: "var(--white)", fontWeight: 600 }}>{phone}</a> or submit your custom travel inquiry.
          </p>
          <div style={{ marginTop: "1.8rem" }}>
            <Link href="/plan-my-trip/" className="btn btn-line-white">Start Planning</Link>
          </div>
        </div>
      </section>
    </>
  );
}
