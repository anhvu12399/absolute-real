/**
 * Image delivery.
 *
 * WordPress hands back the original upload — often a 2560px, 400KB JPEG — and
 * the templates paint it as a CSS background. A background cannot be a
 * `next/image`, so nothing resized it: a thumbnail card and a full-bleed hero
 * both downloaded the same file. On the homepage that came to roughly 54MB.
 *
 * Next's optimizer is reachable as a plain URL, so a background can use it too.
 * The same photograph then arrives as WebP at the width it is actually painted:
 * 177KB → 37KB for a card, → 88KB for a hero.
 *
 * `quality` must be listed in next.config's `images.qualities`.
 */

const QUALITY = 75;

/**
 * Widths the optimizer will accept.
 *
 * These must match `images.imageSizes` + `images.deviceSizes` in next.config:
 * anything else is answered with a 400 and the image simply fails to load. A
 * request for an unlisted width is snapped up to the next allowed one rather
 * than breaking the page.
 */
const ALLOWED = [320, 384, 480, 640, 750, 828, 1080, 1200, 1600, 1920];

const snap = (want: number) => ALLOWED.find((w) => w >= want) ?? ALLOWED[ALLOWED.length - 1];

/** Widths we ask for, matched to how the design actually uses photographs. */
export const IMAGE_WIDTHS = {
  /** Index thumbnails, avatars, inset frames, the header logo. */
  thumb: 384,
  /** Cards in a grid or carousel. */
  card: 640,
  /** Half-width panels and lead cards. */
  panel: 1080,
  /** Full-bleed heroes and plates. */
  hero: 1920,
} as const;

export type ImageWidth = keyof typeof IMAGE_WIDTHS;

/**
 * An optimized URL for a remote WordPress image.
 *
 * Anything already local, a data URI, or an SVG is returned untouched — the
 * optimizer would either reject it or make it bigger.
 */
export function optimized(src?: string | null, width: ImageWidth | number = "card"): string {
  const url = (src || "").trim();
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("/_next/")) return url;
  if (/\.svg(\?|$)/i.test(url)) return url;

  const w = snap(typeof width === "number" ? width : IMAGE_WIDTHS[width]);
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${QUALITY}`;
}

/**
 * A ready-made `style` object, or undefined when there is no photograph.
 *
 * Returning undefined rather than an empty background keeps the caller's
 * `is-empty` styling working: `style={bg(url, "card")}`.
 */
export function bg(src?: string | null, width: ImageWidth | number = "card") {
  const url = optimized(src, width);
  return url ? { backgroundImage: `url(${url})` } : undefined;
}
