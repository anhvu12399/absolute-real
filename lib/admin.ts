/**
 * Links from the front end back to the screen that edits it.
 *
 * Finding the right WordPress screen for a section means knowing that the
 * homepage is a `homepage` post, that a country page is really the legacy
 * `{country}-tours` page, and which ACF tab a field sits under. That is
 * knowledge the site owner should not have to carry, so the page carries it.
 *
 * Link targets are prepared whenever a WordPress origin is configured. Their
 * visibility is controlled client-side by `?asledit=1` in EditBar, which lets
 * an editor enable the tools without rebuilding or changing Vercel env vars.
 */

const ADMIN_ORIGIN = (
  process.env.NEXT_PUBLIC_WP_URL ||
  process.env.WORDPRESS_ORIGIN ||
  ""
).replace(/\/+$/, "");

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || ""
).replace(/\/+$/, "");

export const EDIT_LINKS_ENABLED =
  ADMIN_ORIGIN !== "";

/** The WordPress edit screen for one post. */
export function editPostUrl(id?: number | null) {
  if (!EDIT_LINKS_ENABLED || !id) return "";
  return `${ADMIN_ORIGIN}/wp-admin/post.php?post=${id}&action=edit`;
}

/** The plugin's own import and settings screen. */
export function importScreenUrl() {
  if (!EDIT_LINKS_ENABLED) return "";
  return `${ADMIN_ORIGIN}/wp-admin/admin.php?page=aat-import`;
}

/** A taxonomy term's edit screen, for country pages assembled from a term. */
export function editTermUrl(termId?: number | null, taxonomy = "country") {
  if (!EDIT_LINKS_ENABLED || !termId) return "";
  return `${ADMIN_ORIGIN}/wp-admin/term.php?taxonomy=${taxonomy}&tag_ID=${termId}`;
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
  const url = editPostUrl(opts.content?.id);
  if (url) {
    targets.push({
      label: opts.content?.type === "homepage" ? "Edit homepage" : `Edit "${opts.content?.title || "this page"}"`,
      url,
    });
  }
  targets.push(...(opts.extra || []));
  targets.push({ label: "Import & settings", url: importScreenUrl() });
  return targets.filter((target) => target.url);
}
