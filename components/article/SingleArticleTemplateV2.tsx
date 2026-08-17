import Link from "next/link";
import Image from "next/image";
import type { CardRecord, ContentRecord } from "@/lib/types";
import type { ArchiveItem } from "@/lib/wp";
import { SpecialistBlock } from "../v2/SpecialistBlock";
import { BRAND_SHORT } from "@/lib/site";
import { bg, optimized } from "@/lib/images";

/* ============================================================
   Single Article — "The Dispatch"
   Travel guides, things to do, blog posts and plain posts.

   A magazine feature rather than a blog post: the words open the
   page, the photograph follows as a plate, and the body runs in a
   measured column with a standing contents rail beside it. Every
   part is drawn from WordPress - the rail is built from the H2s
   the editor actually wrote, the pull quote is a sentence out of
   the body, and nothing here invents copy.

   Deliberately unlike the other templates: the hotel page is a
   catalogue file, the destination page a guide; this one is print.
   ============================================================ */

function ArrowSvg() {
  return <svg><use href="#i-arrow"></use></svg>;
}

type GalleryRow = { image_url?: string; caption?: string };

/**
 * Section headings, with ids injected so the rail can link to them.
 *
 * Some imported posts have no headings at all - their sections are paragraphs
 * that hold nothing but a bold run. A reader sees a heading; a search engine
 * and a screen reader see body text. Those are promoted to real h2s first, so
 * the page gains an outline it always looked like it had.
 */
function buildContents(html: string) {
  const promoted = html.replace(
    /<p[^>]*>\s*<strong>([\s\S]{2,90}?)<\/strong>\s*<\/p>/gi,
    (match, inner) => (/<(a|img)\b/i.test(inner) ? match : `<h2>${inner}</h2>`),
  );

  /* Whichever level the piece actually uses for its sections. */
  const level = /<h2[\s>]/i.test(promoted) ? 2 : 3;
  const chapters: Array<{ id: string; label: string }> = [];
  let index = 0;

  const withIds = promoted.replace(
    new RegExp(`<h${level}([^>]*)>([\\s\\S]*?)</h${level}>`, "gi"),
    (match, attrs, inner) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      if (!label) return match;
      index += 1;
      const id = `s-${index}`;
      chapters.push({ id, label });
      /* Keep any attributes the editor set; only add the anchor. */
      return `<h${level}${/\bid=/.test(attrs) ? attrs : `${attrs} id="${id}"`}>${inner}</h${level}>`;
    },
  );

  return { html: withIds, chapters };
}

/**
 * A sentence from the middle of the piece, for the pull quote.
 *
 * Long enough to carry a thought, short enough to set large. Taken from the
 * body so the quote is always the writer's own words.
 */
function pullQuote(html: string) {
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 90 && s.length <= 190);
  if (sentences.length < 3) return "";
  return sentences[Math.floor(sentences.length / 2)].trim();
}

function RelatedIndex({ title, items }: { title: string; items: Array<CardRecord | ArchiveItem> }) {
  if (!items.length) return null;
  return (
    <section className="section on-cream">
      <div className="container">
        <div className="dispatch-head">
          <span className="dispatch-rule" />
          <h2>{title}</h2>
        </div>
        <div className="dispatch-index">
          {items.map((item, idx) => (
            <Link href={item.path} key={item.id} className="dispatch-index-row">
              <span className="dispatch-index-no">{String(idx + 1).padStart(2, "0")}</span>
              <span
                className={`dispatch-index-thumb ${item.featuredMedia?.url ? "" : "is-empty"}`}
                style={item.featuredMedia?.url ? bg(item.featuredMedia.url, "thumb") : undefined}
              />
              <span className="dispatch-index-copy">
                <strong>{item.title}</strong>
                <span>{item.excerpt}</span>
              </span>
              <span className="dispatch-index-go"><ArrowSvg /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SingleArticleTemplateV2({
  data,
  moreReading = [],
  countryTours = [],
  siblings = [],
}: {
  data?: ContentRecord | null;
  /** Queried from the same country when the article has no editor picks. */
  moreReading?: ArchiveItem[];
  countryTours?: ArchiveItem[];
  /** Pages that belong to the same set, e.g. the other month guides. */
  siblings?: ArchiveItem[];
}) {
  const acf = (data?.acf || {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  const title = data?.title || "Travel Guide";
  const hero = data?.featuredMedia?.url || text(acf.hero_image);
  const readMinutes = text(acf.read_minutes) || String(acf.read_minutes ?? "").replace(/[^\d]/g, "");
  const country = data?.terms?.find((term) => term.taxonomy === "country");
  const category = country || data?.terms?.find((term) => term.taxonomy === "category");

  /* WordPress auto-excerpts open with the body's first heading or its first
     words; either would print the same sentence twice on the page. */
  const bodyRaw = String(data?.content || "");
  const { html: body, chapters } = buildContents(bodyRaw);
  const flatten = (value: string) => value.replace(/&#?[a-z0-9]+;/gi, " ").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const rawExcerpt = String(data?.excerpt || "").replace(/<[^>]+>/g, "").trim();
  const bodyFlat = flatten(bodyRaw);
  /* `intro_html` is often just the title again, and the auto-excerpt is often
     the body's opening words - either would print the same sentence twice. */
  const introText = text(acf.intro_html).replace(/<[^>]+>/g, "").trim();
  const titleFlat = flatten(title);
  const candidate =
    introText && !flatten(introText).startsWith(titleFlat)
      ? introText
      : rawExcerpt && !bodyFlat.startsWith(flatten(rawExcerpt).slice(0, 50))
        ? rawExcerpt
        : "";
  const standfirst = flatten(candidate).startsWith(titleFlat) ? "" : candidate;

  const quote = pullQuote(bodyRaw);
  const gallery = (Array.isArray(acf.gallery) ? acf.gallery : []).filter((row: GalleryRow) => row?.image_url) as GalleryRow[];
  const extraBody = text(acf.content_left);
  const planTitle = text(acf.plan_title);
  const planDescription = text(acf.plan_description);
  const planHtml = text(acf.plan_html);
  const planFooter = text(acf.plan_footer);
  const planLink = text(acf.view_more_link) || "/plan-my-trip/";
  const planLinkLabel = text(acf.view_more_label) || "Start Planning";
  const hasPlan = Boolean(planTitle || planDescription || planHtml || planFooter);

  const published = data?.date
    ? new Date(data.date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const reading = data?.related?.related_guides?.length ? data.related.related_guides : moreReading;
  const journeys = data?.related?.related_tours?.length ? data.related.related_tours : countryTours;

  return (
    <article className="dispatch">
      {/* ═══ MASTHEAD — words first, the way a feature opens ═══ */}
      <header className="section on-cream dispatch-masthead">
        <div className="container">
          <p className="crumb">
            <Link href="/">{BRAND_SHORT}</Link><span>/</span>
            {category && (
              <>
                <Link href={category.path || "/travel-guides/"}>{category.name}</Link><span>/</span>
              </>
            )}
            <span className="current">{title}</span>
          </p>

          <div className="dispatch-open">
            <span className="dispatch-kicker">
              {category?.name || "Dispatch"}
            </span>
            <h1>{title}</h1>
            {standfirst && <p className="dispatch-standfirst">{standfirst}</p>}

            <div className="dispatch-meta">
              {published && <span>{published}</span>}
              {readMinutes && <span data-preview="read_minutes">{readMinutes} min read</span>}
              {country && <span>{country.name}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ PLATE ═══ */}
      {hero && (
        <figure className="dispatch-plate" data-preview="hero_image">
          <div><Image src={hero} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" style={{ objectFit: "cover" }} /></div>
          {data?.featuredMedia?.alt && <figcaption>{data.featuredMedia.alt}</figcaption>}
        </figure>
      )}

      {/* ═══ BODY, with a standing contents rail ═══ */}
      <section className="section on-white">
        <div className="container dispatch-body">
          {chapters.length > 2 && (
            <aside className="dispatch-rail">
              <span className="dispatch-rule" />
              <p className="dispatch-rail-title">In this guide</p>
              <ol>
                {chapters.map((chapter, idx) => (
                  <li key={chapter.id}>
                    <a href={`#${chapter.id}`}>
                      <span>{String(idx + 1).padStart(2, "0")}</span>
                      {chapter.label}
                    </a>
                  </li>
                ))}
              </ol>
            </aside>
          )}

          <div className={`dispatch-column ${chapters.length > 2 ? "" : "is-centred"}`}>
            {body && <div className="wordpress-content dispatch-prose" dangerouslySetInnerHTML={{ __html: body }} />}

            {quote && (
              <blockquote className="dispatch-quote">
                <span className="dispatch-rule" />
                <p>{quote}</p>
              </blockquote>
            )}

            {extraBody && (
              <div className="wordpress-content dispatch-prose" data-preview="content_left" dangerouslySetInnerHTML={{ __html: extraBody }} />
            )}

            {text(acf.content_right_image) && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="dispatch-inline-image" data-preview="content_right_image" src={optimized(text(acf.content_right_image), "panel")} alt={title} loading="lazy" />
            )}
          </div>
        </div>
      </section>

      {/* ═══ PLATES ═══ */}
      {gallery.length > 0 && (
        <section className="section on-ink dispatch-gallery-band" data-preview="gallery">
          <div className="container">
            <div className="dispatch-head light">
              <span className="dispatch-rule light" />
              <h2 data-preview="gallery_title">{text(acf.gallery_title) || "From the journey"}</h2>
            </div>
            <div className="dispatch-plates">
              {gallery.map((row, idx) => (
                <figure key={idx} className={`dispatch-plate-item p${(idx % 4) + 1}`}>
                  <div style={bg(row.image_url, "hero")} />
                  <figcaption>
                    <span>{String(idx + 1).padStart(2, "0")}</span>
                    {row.caption || title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ ENDNOTE ═══ */}
      {hasPlan && (
        <section className="section on-cream" id="plan">
          <div className="container dispatch-endnote">
            <span className="dispatch-rule" />
            {planTitle && <h2 className="dispatch-endnote-title" data-preview="plan_title">{planTitle}</h2>}
            {planDescription && <div className="wordpress-content" data-preview="plan_description" dangerouslySetInnerHTML={{ __html: planDescription }} />}
            {planHtml && <div className="wordpress-content plan-block" data-preview="plan_html" dangerouslySetInnerHTML={{ __html: planHtml }} />}
            {planFooter && <div className="wordpress-content" data-preview="plan_footer" dangerouslySetInnerHTML={{ __html: planFooter }} />}
            <Link href={planLink} className="btn btn-fill-ink" data-preview="view_more_label">{planLinkLabel}</Link>
          </div>
        </section>
      )}

      <RelatedIndex title="Other Months to Travel" items={siblings} />
      <span data-preview="further_title" style={{ display: "contents" }}>
        <RelatedIndex title={text(acf.further_title) || "Further Reading"} items={reading} />
      </span>
      <RelatedIndex title="Journeys That Go There" items={journeys} />

      <SpecialistBlock acf={acf} />
    </article>
  );
}
