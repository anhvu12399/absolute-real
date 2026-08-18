# Next.js → Astro migration

Phase 1 (audit) only. **No code has been changed.** Nothing here has been
deployed, and the Next.js site on `www.absoluteasiatours.com` is untouched.

Read the "Four decisions" section before approving Phase 2. Two of the four
would change how the site behaves for the office, not just how it is built,
and one of them costs money.

---

## Current architecture

Measured, not assumed — every number below came from reading this repo or
querying the live site on 2026-08-18.

| | |
|---|---|
| Next.js | `latest` in package.json, resolving to 16.3 with Turbopack |
| Router | App Router, single catch-all `app/[[...slug]]/page.tsx` |
| Rendering | ISR — `export const revalidate = 300`, plus `generateStaticParams` |
| Trailing slash | `trailingSlash: true` — **every URL ends in `/`** |
| CMS | Headless WordPress at `backend.absoluteasiatours.com`, REST only, no GraphQL |
| Bridge | Custom plugin `absolute-asia` v3.10.0, routes under `/wp-json/absolute-asia/v1/*` |
| SEO source | Rank Math, read through `/rankmath/v1/getHead` — **not** hardcoded |
| Records | 643 (224 place_to_go, 173 page, 109 tour, 59 hotel, 29 thing_to_do, 26 travel_guide, 17 blog, 5 trip, 1 homepage) |
| Sitemap | 639 URLs (643 minus WooCommerce leftovers marked noindex) |
| Components | 30 total, **23 are `"use client"`** (~7,800 lines) |
| JS payload | 781 KB raw / **234 KB brotli**, 11 files |
| CSS | one file, 137 KB raw / 99 KB served, no Tailwind |
| Fonts | 6 self-hosted woff2, `font-display: swap`, unicode-range subset |
| Images | 65 call sites, 1,511 distinct URLs, all through `/_next/image` |
| Analytics | Vercel Analytics + Speed Insights only. **No GTM, no GA4, no Meta Pixel** |
| Forms | one — `PlanTripTemplateV2` → `POST /api/leads` |
| Search | `?q=` on the catch-all, server-rendered |
| Pagination | none |
| Middleware | none |
| Host today | Cloudflare DNS → Vercel (project `absolute-real-eight`) |

### Routes

| Route | Purpose |
|---|---|
| `app/[[...slug]]/page.tsx` | Every content URL. Dispatches on WordPress post type. |
| `app/api/leads/route.ts` | Enquiry form → Resend, WP `wp_mail` bridge, optional Postgres |
| `app/api/revalidate/route.ts` | HMAC webhook from WordPress → `revalidatePath`/`revalidateTag` |
| `app/api/revalidate/self/route.ts` | Same, triggered from the frontend EditBar |
| `app/api/indexing/route.ts` | Google Indexing API submissions |
| `app/sitemap.ts` | 639 URLs, `revalidate = 3600` |
| `app/robots.ts` | Explicitly welcomes AI crawlers (see Known issues) |
| `app/llms.txt`, `app/llms-full.txt` | GEO content for AI engines |
| `app/not-found.tsx` | Real 404 |

### next.config.ts

- **23 redirects** — legacy URLs (`/places-to-go/`, `/travel-guides/`, `/things-to-do/`, …)
- **10 rewrites** proxying to WordPress: `/wp-admin/*`, `/wp-login.php`,
  `/wp-json/*`, `/wp-content/uploads/*`, `/wp-content/themes/*`,
  `/wp-content/plugins/*`, `/wp-includes/*`, `/cdn-cgi/*`, `/sitemap_index.xml`,
  `/:name*-sitemap.xml`
- 2 header rules (no-store on wp-admin, nosniff on /api)

---

## Four decisions needed before Phase 2

These are not implementation details. Each one changes what the site can do.

### 1. "Save in WordPress → live immediately" stops working as it does today

Built and verified earlier in this project. WordPress fires `save_post`, pings
`/api/revalidate` with an HMAC signature, and Next rebuilds *that one page*
in about a second.

**Astro on Cloudflare Pages has no equivalent.** `revalidatePath` is a Next.js
API backed by the ISR cache. The options are:

| Option | Publish delay | Cost | Trade-off |
|---|---|---|---|
| **A. Full SSR** (`output: 'server'`, Cloudflare adapter) | instant | free | Every request hits WordPress. TTFB rises; the whole point of static is lost. Needs a KV/Cache API layer to be sane. |
| **B. Rebuild on webhook** (Pages Deploy Hook) | **2–6 min** for 643 pages | free | Simple and truly static. The office waits minutes to see a typo fix. |
| **C. Hybrid** — static pages + SSR for recently-edited paths | near-instant | free | Most work to build; most moving parts. |

My recommendation: **B**, and say plainly that publishing takes a few minutes.
It is honest, it is simple, and it is what most static travel sites do. But it
*is* a downgrade from what exists today and the office will notice.

### 2. Image optimisation has no free equivalent

1,511 distinct images, all served through `/_next/image` (AVIF/WebP, 10
device widths, quality 75–85). This is doing real work: the hero alone is
118 KB at w=1920 instead of 279 KB from WordPress.

Cloudflare Pages has **no built-in image resizing**. Options:

| Option | Cost | Notes |
|---|---|---|
| **A. Cloudflare Images / Image Resizing** | **paid** — from $5/mo + usage | Closest match. Needs the zone on a paid plan. |
| **B. Astro `<Image>` at build time** (sharp) | free | Downloads and resizes 1,511 remote images **during every build**. Build time goes from ~2 min to 20+ min. Fragile. |
| **C. Serve WordPress originals directly** | free | Simplest. **Costs real performance** — the hero becomes 279 KB instead of 118 KB. Directly contradicts goal 7. |
| **D. Keep a Vercel/other origin just for `/_next/image`** | free tier | Odd but works. Two hosts to maintain. |

There is no option here that is free, fast, and simple at once. This is the
single biggest reason to question the move.

### 3. The WordPress proxy needs rebuilding

Ten rewrite rules currently make `www.absoluteasiatours.com/wp-admin/` serve
the WordPress admin. On Pages these become either a `functions/` catch-all
Function or Cloudflare Rules (Transform/Origin Rules, zone-level). Doable —
but it is infrastructure work outside the Astro codebase, and getting
`/wp-content/uploads/*` wrong breaks images site-wide.

### 4. Live Preview and the Edit bar

409 lines built this session: `AdminPreviewBridge` (postMessage receiver,
resolves `data-preview="<field>"` on the markup) and `EditBar` (admin-only,
deep-links into the right ACF tab, "republish this page" button). Both are
client React and both are tied to markup that would be rewritten.

They port, but they are real work and they are the office's daily tools.

---

## Migration map

`Next.js route → Astro route → data source → rendering → SEO`

```
/                          → src/pages/index.astro
                             ← /absolute-asia/v1/content?path=/
                             ← /absolute-asia/v1/archive (tours, places, hotels, cruises, guides)
                             ← /absolute-asia/v1/terms?taxonomy=country
                             ← /absolute-asia/v1/site
                             static · Rank Math head + Organization + WebSite JSON-LD

/[...slug]/                → src/pages/[...slug].astro   (getStaticPaths from /paths)
                             ← /absolute-asia/v1/content?path=<path>
                             static, 643 pages · Rank Math head per URL
                             dispatches by post type:
                               tour        → TourPage.astro
                               place_to_go → DestinationPage.astro
                               hotel       → HotelPage.astro
                               travel_guide/blog/post/thing_to_do → ArticlePage.astro
                               trip        → TripPage.astro
                               page        → StandardPage.astro / directory templates
                             country terms → DestinationTermPage (not in /paths — enumerate /terms)

/tours/, /destinations/,   → directory pages, same files, archive queries
/where-to-stay/, /cruises/,
/journeys/, /inspirations/

?q=<query>                 → src/pages/search.astro, SSR or client island
                             noindex (matches today)

/api/leads                 → functions/api/leads.ts     (Pages Function)
/api/revalidate            → functions/api/revalidate.ts → triggers Deploy Hook (option B)
/api/indexing              → functions/api/indexing.ts
/sitemap.xml               → src/pages/sitemap.xml.ts, same 639-URL logic + isPrivatePath filter
/robots.txt                → public/robots.txt or endpoint, byte-identical
/llms.txt, /llms-full.txt  → src/pages/llms.txt.ts
404                        → src/pages/404.astro — must return real 404, not 200
23 redirects               → public/_redirects (Cloudflare Pages native)
10 WP rewrites             → functions/[[path]].ts or Cloudflare Origin Rules
```

### Component plan

| Class | Components | Action |
|---|---|---|
| **A — no JS needed** | V2Footer, SpecialistBlock, GuideSections, RelatedIndex, most of the tour/destination/hotel/article body | Rewrite as `.astro`. This is where the 234 KB of JS goes. |
| **B — small interaction** | V2Header (dropdown + mobile menu), MobileActionBar, BackToTop, WhatsAppButton, RevealWrapper | Astro component + a few lines of vanilla JS, or `client:idle` island |
| **C — keep React** | RealMapComponent (Leaflet), PlanTripTemplateV2 (the form), HomeTemplateV2 tabs/carousel | `client:visible` / `client:idle` React islands. No rewrite — they work. |
| **D — admin only** | EditBar, AdminPreviewBridge | `client:only="react"`, loaded only when the admin cookie is present |

Estimated JS after: **~40–70 KB brotli** on a content page (map and form
pages higher), down from 234 KB.

---

## Completed routes

None. Phase 1 only.

## Pending routes

All of them.

---

## Known issues found during the audit

Recorded rather than silently changed, per the brief.

### AI crawlers are blocked at the Cloudflare edge

```
Existing issue:  robots.txt served to Google contains a Cloudflare-managed
                 block disallowing GPTBot, ClaudeBot, Google-Extended, CCBot,
                 Bytespider, Amazonbot, Applebot-Extended, meta-externalagent,
                 plus "Content-Signal: ai-train=no". app/robots.ts explicitly
                 allows all of them — the two contradict each other and
                 Lighthouse reports robots.txt as invalid (SEO 92, not 100).
Impact:          GEO is effectively zero regardless of llms.txt quality.
                 Migrating to Astro does not fix this.
Recommended fix: Turn off AI Scrapers & Crawlers / managed robots.txt in the
                 Cloudflare dashboard. Zone-level, not code.
Migration-safe:  Nothing to do in Astro. Carry app/robots.ts over unchanged.
```

### LCP 7.0s on mobile, cause not yet established

```
Existing issue:  Mobile LCP 7.0s on the main domain. Breakdown: Render Delay
                 80%, Load Time 11%. The image is fine — responsive-images,
                 modern-formats and optimized-images all pass, TBT is 20ms.
Impact:          Well outside Google's 2.5s "good" threshold.
Recommended fix: Unknown. Suspicion is the 22s `spine-drift` zoom plus
                 `will-change: transform` on `.spine-plate`, unproven.
Migration-safe:  Astro removes hydration entirely from that page, which may
                 resolve it as a side effect. Must be re-measured after Phase
                 11 rather than assumed.
```

### Two Vercel projects, one domain

```
Existing issue:  www.absoluteasiatours.com is served by Vercel project
                 `absolute-real-eight`. Deploys from this repo's CLI go to
                 `absolute-real`, a different project, which reaches the main
                 domain only when the GitHub integration on the other project
                 rebuilds. The last three commits have not arrived.
Impact:          Fixes appear to ship and do not. Cost me an invalid
                 performance measurement in this session.
Recommended fix: Consolidate to one project before cutover, or the Astro site
                 will inherit the same confusion.
```

### Image optimizer quota exhausted on `absolute-real`

```
Existing issue:  /_next/image returns HTTP 402 (Payment Required) on the
                 absolute-real project. The main domain is unaffected.
Impact:          Any benchmark run against absolute-real.vercel.app measures
                 a page with no images.
Recommended fix: Check the Vercel plan for that project, or stop using it.
```

---

## SEO differences

Target: **zero**. The audit's comparison script (Phase 10) must show no
difference in status, title, description, canonical, robots, H1, JSON-LD,
internal links or image count for all 639 URLs.

Specific things that must not drift:

- `trailingSlash: true` — every URL ends in `/`. Astro needs
  `trailingSlash: 'always'` **and** `build.format: 'directory'`, or 639 URLs
  change shape at once.
- Canonical comes from Rank Math and must keep pointing at
  `https://www.absoluteasiatours.com/...`, never at `backend.`. There is
  already a `publicCanonical()` guard for this — port it.
- `/tours/does-not-exist/` must return **404, not 200**. Today
  `generateStaticParams` + `dynamicParams` handles this; in Astro,
  `getStaticPaths` gives it for free — but the SSR fallback must not invent a
  page.
- 8 schema builders exist (Organization, WebSite, BreadcrumbList, content
  types, TouristDestination, CollectionPage, Review/AggregateRating). Port as
  data, not as markup, and keep the `@id` merge pattern — two scripts share
  `#organization` on purpose.

## Performance changes

Baseline (main domain, mobile Lighthouse, 2026-08-18):

```
Performance 69 · FCP 2.8s · LCP 7.0s · TBT 20ms · CLS 0
SEO 92 · Accessibility 90 · Best Practices 100
JS 234 KB brotli
```

Target after migration: Performance 90+, JS under 70 KB, LCP under 2.5s.
LCP is the uncertain one — see Known issues.

## Deployment instructions

To be written in Phase 12. Outline:

- Cloudflare Pages project, build `astro build`, output `dist`
- Preview on `*.pages.dev` — **not** attached to the live domain
- Env: `WORDPRESS_ORIGIN`, `WORDPRESS_API_URL`, `RESEND_API_KEY`,
  `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL`, `WORDPRESS_REVALIDATE_SECRET`,
  `DATABASE_URL` — all **server-only**, none prefixed `PUBLIC_`
- `PUBLIC_` vars: `SITE_URL`, `BRAND_*`, `LEGAL_ENTITY`, `SOCIALS`, `WP_URL`
- Cutover is a DNS/Pages-domain change, reversible in minutes

## Rollback instructions

The Next.js site stays deployed and functional throughout. Rollback is
pointing the domain back at the Vercel project — no rebuild, no data change.
WordPress is never modified by this migration, so there is nothing to restore
on the CMS side.
