/**
 * Image delivery & performance optimization.
 *
 * Next.js optimizer serves next-generation AVIF and WebP images with custom widths
 * and crisp qualities tailored for high-DPI displays.
 */

const QUALITY_STANDARD = 80;
const QUALITY_HERO = 85;

/**
 * Widths the optimizer will accept.
 * Must match `images.imageSizes` + `images.deviceSizes` in next.config.
 */
const ALLOWED = [320, 384, 480, 640, 750, 828, 1080, 1200, 1600, 1920, 2048];

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
 * Returns AVIF/WebP with tailored compression.
 */
export function optimized(src?: string | null, width: ImageWidth | number = "card", quality?: number): string {
  const url = (src || "").trim();
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("/_next/")) return url;
  if (/\.svg(\?|$)/i.test(url)) return url;

  const w = snap(typeof width === "number" ? width : IMAGE_WIDTHS[width]);
  const q = quality || (w >= 1200 ? QUALITY_HERO : QUALITY_STANDARD);
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
}

/**
 * A ready-made `style` object with hardware-accelerated background image.
 */
export function bg(src?: string | null, width: ImageWidth | number = "card", quality?: number) {
  const url = optimized(src, width, quality);
  return url ? { backgroundImage: `url(${url})` } : undefined;
}

