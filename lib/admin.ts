/**
 * Links from the front end back to the screen that edits it.
 *
 * Finding the right WordPress screen for a section means knowing that the
 * homepage is a `homepage` post, that a country page is really the legacy
 * `{country}-tours` page, and which ACF tab a field sits under. That is
 * knowledge the site owner should not have to carry, so the page carries it.
 *
 * Link targets are prepared whenever a WordPress origin is configured. Nothing
 * here decides who sees them: EditBar asks the backend whether the visitor can
 * edit, and renders nothing otherwise. These URLs point at wp-admin, which
 * does its own checking regardless.
 */

import { WP_ORIGIN } from "@/lib/wp-origin";

/* Same origin the content comes from. Reading only NEXT_PUBLIC_WP_URL here
   meant a deployment that sets WORDPRESS_API_URL instead — or sets nothing and
   relies on the fallback — served pages perfectly while every edit link came
   back empty, so the bar had nothing to show and never rendered. */
const ADMIN_ORIGIN = (
  process.env.NEXT_PUBLIC_WP_URL ||
  process.env.WORDPRESS_ORIGIN ||
  WP_ORIGIN ||
  ""
).replace(/\/+$/, "");

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || ""
).replace(/\/+$/, "");

export const EDIT_LINKS_ENABLED =
  ADMIN_ORIGIN !== "";

/**
 * The WordPress edit screen for one post.
 *
 * `field` is an ACF field *name* (`quote_text`, not `field_aat_home_quote`).
 * The plugin reads it back off the URL, opens the tab that field sits in, and
 * scrolls to it — a plain `#anchor` cannot, because a field inside a closed
 * ACF tab is display:none and the browser scrolls to nothing.
 */
export function editPostUrl(id?: number | null, field?: string) {
  if (!EDIT_LINKS_ENABLED || !id) return "";
  const base = `${ADMIN_ORIGIN}/wp-admin/post.php?post=${id}&action=edit`;
  return field ? `${base}&aat_field=${encodeURIComponent(field)}` : base;
}

/** The plugin's own import and settings screen. */
export function importScreenUrl() {
  if (!EDIT_LINKS_ENABLED) return "";
  return `${ADMIN_ORIGIN}/wp-admin/admin.php?page=aat-import`;
}

/** A taxonomy term's edit screen, for country pages assembled from a term. */
export function editTermUrl(termId?: number | null, taxonomy = "country", field?: string) {
  if (!EDIT_LINKS_ENABLED || !termId) return "";
  const base = `${ADMIN_ORIGIN}/wp-admin/term.php?taxonomy=${taxonomy}&tag_ID=${termId}`;
  return field ? `${base}&aat_field=${encodeURIComponent(field)}` : base;
}

/** Build a preview URL pointing to a frontend section anchor. */
export function previewUrl(path: string, section?: string) {
  if (!EDIT_LINKS_ENABLED) return "";
  const base = SITE_ORIGIN || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}${section ? `#${section}` : ""}`;
}

export type EditTarget = {
  label: string;
  url: string;
  hint?: string;
  /** Section anchor on the frontend page — used for preview links. */
  section?: string;
  /** Group label to visually cluster related targets. */
  group?: string;
};

/**
 * Which section of a page maps to which ACF field, per post type.
 *
 * `section` is the id already on the rendered `<section>`, so the "view" button
 * scrolls to the right place; `field` is the ACF field name the edit link opens.
 * One representative field per section is enough — landing inside the right tab
 * is what the editor actually needs.
 */
const SECTION_FIELDS: Record<string, Array<{ section: string; label: string; field: string }>> = {
  homepage: [
    { section: "hero", label: "Hero slider", field: "home_banner_slider" },
    { section: "statement", label: "Brand statement", field: "intro_headline" },
    { section: "journeys", label: "Destination tabs", field: "tabs_headline" },
    { section: "featured", label: "Featured journeys", field: "featured_headline" },
    { section: "stay", label: "Cruises & stays", field: "stay_headline" },
    { section: "inspiration", label: "Travel inspiration", field: "inspiration_headline" },
    { section: "map", label: "Map", field: "map_headline" },
    { section: "specialists", label: "Specialists", field: "team" },
    { section: "reviews", label: "Client reviews", field: "testimonials" },
    { section: "quote", label: "Quote band", field: "quote_text" },
    { section: "responsibly", label: "Travel responsibly", field: "responsibly_text" },
    { section: "values", label: "Statement band & values", field: "home_values" },
    { section: "plan", label: "Enquiry CTA", field: "plan_headline" },
  ],
  tour: [
    { section: "overview", label: "Overview & highlights", field: "highlights_list" },
    { section: "itinerary", label: "Day by day", field: "itinerary" },
    { section: "stays", label: "Stays on this journey", field: "hotels_title" },
    { section: "inclusions", label: "Inclusions & dates", field: "inclusions_list" },
    { section: "gallery", label: "Gallery", field: "gallery" },
    { section: "faqs", label: "FAQs", field: "faqs" },
  ],
  place_to_go: [
    { section: "journeys", label: "Journeys section", field: "related_title" },
    { section: "experiences", label: "Experiences", field: "experiences" },
    { section: "hotels", label: "Where to stay", field: "stays_heading" },
    { section: "map", label: "Map", field: "map_headline" },
    { section: "months", label: "When to go", field: "month_guide" },
  ],
  hotel: [
    { section: "gallery", label: "Gallery", field: "gallery" },
    { section: "facts", label: "In brief", field: "hotel_highlights" },
    { section: "nearby", label: "Nearby places", field: "nearby_places" },
  ],
};

/**
 * Everything worth editing on the current page, in the order a person would
 * look for it.
 *
 * `hint` explains a section whose front-end appearance does not match what the
 * admin screen shows - a repeater that fills itself from live content when an
 * editor leaves it empty, for instance.
 */
export function editTargets(opts: {
  content?: { id?: number; type?: string; title?: string } | null;
  extra?: EditTarget[];
}): EditTarget[] {
  if (!EDIT_LINKS_ENABLED) return [];

  const targets: EditTarget[] = [];
  const id = opts.content?.id;
  const url = editPostUrl(id);
  if (url) {
    targets.push({
      label: opts.content?.type === "homepage" ? "Edit homepage" : `Edit "${opts.content?.title || "this page"}"`,
      url,
    });
  }

  /* One row per section, each landing on the field that section is built from
     rather than at the top of a long edit screen. */
  for (const entry of SECTION_FIELDS[opts.content?.type || ""] || []) {
    const sectionUrl = editPostUrl(id, entry.field);
    if (sectionUrl) {
      targets.push({ ...entry, url: sectionUrl, group: "Từng phần" });
    }
  }

  targets.push(...(opts.extra || []));
  targets.push({ label: "Import & settings", url: importScreenUrl() });
  return targets.filter((target) => target.url);
}
