import { NextRequest, NextResponse } from "next/server";

// Pixel-accurate migration baseline: WordPress still renders templates that have
// not passed visual parity. Native Next.js templates replace these routes one by
// one only after screenshot and SEO comparison.

const DEFAULT_ORIGIN = "https://origin.absoluteasiatours.com";

// Must stay in sync with next.config.ts -> images.deviceSizes.
// /_next/image rejects any `w` value outside deviceSizes u imageSizes with a 400.
const DEVICE_SIZES = [320, 480, 640, 750, 828, 1080, 1200, 1600, 1920];

const OWN_HOST = /^(?:www\.)?absoluteasiatours\.com$/i;
const OPTIMIZABLE = /\.(?:avif|jpe?g|png|webp)(?:[?#]|$)/i;

function wordpressOrigin() {
  return (process.env.WORDPRESS_RENDER_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
}

/**
 * Strips the FastPixel CDN wrapper, if present, returning the underlying URL.
 */
function unwrapFastPixel(value: string) {
  const decoded = value.replace(/&amp;/g, "&").trim();
  const accelerated = decoded.match(/^https:\/\/cdn\.fastpixel\.io\/fp\/[^/]+\/(.+)$/i);
  if (!accelerated) return decoded;
  try {
    return `https://${decodeURIComponent(accelerated[1])}`;
  } catch {
    return decoded;
  }
}

/**
 * Own-domain assets become root-relative so they keep working both on the
 * Vercel preview host and after the production domain is cut over. The
 * /wp-content and /wp-includes rewrites in next.config.ts serve them.
 * Third-party URLs are returned untouched.
 */
function restoreAssetUrl(value: string) {
  const restored = unwrapFastPixel(value);
  try {
    const url = new URL(restored, "https://www.absoluteasiatours.com");
    if (OWN_HOST.test(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {}
  return restored;
}

/**
 * Returns a root-relative path for own-domain assets, or null for anything
 * hosted elsewhere (which /_next/image can only serve via remotePatterns).
 */
function ownAssetPath(value: string) {
  const restored = unwrapFastPixel(value);
  try {
    const url = new URL(restored, "https://www.absoluteasiatours.com");
    if (OWN_HOST.test(url.hostname)) return `${url.pathname}${url.search}`;
  } catch {}
  return null;
}

function rewriteInternalNavigation(html: string) {
  const productionHosts = [
    "https://www.absoluteasiatours.com",
    "https://absoluteasiatours.com",
    "http://www.absoluteasiatours.com",
    "http://absoluteasiatours.com",
  ];

  return productionHosts.reduce((result, host) => {
    const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result.replace(
      new RegExp(`(<a\\b[^>]*?href=["'])${escaped}(/|(?=["']))`, "gi"),
      (_match, prefix: string, slash: string) => `${prefix}${slash || "/"}`,
    );
  }, html);
}

function addPreviewRobots(html: string) {
  if (process.env.VERCEL_ENV === "production") return html;
  const robots = '<meta name="robots" content="noindex,nofollow,noarchive">';
  return html.includes("</head>") ? html.replace("</head>", `${robots}</head>`) : html;
}

function removePreviewRecaptchaError(html: string) {
  if (process.env.VERCEL_ENV === "production") return html;
  return html
    .replace(/<script\b(?=[^>]*\bid=["']wpforms-recaptcha-js["'])[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b(?=[^>]*\bid=["']wpforms-recaptcha-js-after["'])[^>]*>[\s\S]*?<\/script>/gi, "");
}

/**
 * FIX 1 - Image handling now runs BEFORE the FastPixel URL restore, so the
 * original CDN URL in data-fpo-src is still intact and parseable.
 * FIX 2 - /_next/image (no trailing slash; /_next/image/ is a 404).
 * FIX 3 - only widths from DEVICE_SIZES are emitted, so the optimizer never
 * answers 400 for an arbitrary declared width.
 * FIX 4 - falls back to `src` when data-fpo-src is absent, so plain WordPress
 * images are handled too.
 */
function optimizeImagesWithVercel(html: string) {
  let result = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const source =
      tag.match(/\sdata-fpo-src=(["'])(.*?)\1/i)?.[2] ||
      tag.match(/\ssrc=(["'])(.*?)\1/i)?.[2];
    if (!source) return tag;

    const path = ownAssetPath(source);
    // Data URIs, placeholders and third-party hosts are left alone.
    if (!path || path.startsWith("data:")) return tag;

    const stripped = tag
      .replace(/\sdata-fpo-src=(["'])(.*?)\1/i, "")
      .replace(/\sdata-fpo-sources=(["'])(.*?)\1/i, "")
      .replace(/\ssrcset=(["'])(.*?)\1/i, "")
      .replace(/\ssizes=(["'])(.*?)\1/i, "")
      .replace(/\sloading=(["'])(.*?)\1/i, "")
      .replace(/\sdecoding=(["'])(.*?)\1/i, "")
      .replace(/\ssrc=(["'])(.*?)\1/i, ` src="${path}"`);

    // Vercel intentionally rejects SVG optimization. Keep SVG/GIF and other
    // vector/animated assets on their original URL so icons never become a
    // broken-image question mark.
    if (!OPTIMIZABLE.test(path)) {
      return stripped.replace(/\s*\/?>$/, ' loading="lazy" decoding="async">');
    }

    const declaredWidth = Number(tag.match(/\swidth=(["'])(\d+)\1/i)?.[2] || 1920);
    const ceiling = Math.min(Math.max(declaredWidth, 640), 1920);
    const candidates = DEVICE_SIZES.filter((width) => width <= ceiling);
    if (candidates.length === 0) candidates.push(DEVICE_SIZES[0]);

    const srcset = candidates
      .map((width) => {
        const optimized = `/_next/image?url=${encodeURIComponent(path)}&w=${width}&q=75`;
        return `${optimized.replace(/&/g, "&amp;")} ${width}w`;
      })
      .join(", ");

    const priority = /\b(?:custom-logo|img-banner|swiper-slide-active)\b/i.test(stripped);
    const compactImage = /\b(?:avatar|social|icon|custom-logo)\b/i.test(stripped);
    const sizes = compactImage
      ? "(max-width: 768px) 96px, 180px"
      : declaredWidth <= 400
      ? `${declaredWidth}px`
      : `(max-width: 768px) 100vw, ${Math.min(declaredWidth, 1920)}px`;

    return stripped.replace(
      /\s*\/?>$/,
      ` srcset="${srcset}" sizes="${sizes}" loading="${priority ? "eager" : "lazy"}" decoding="async"${
        priority ? ' fetchpriority="high"' : ""
      }>`,
    );
  });

  // Preloads for the FastPixel CDN are useless once images are re-pointed.
  result = result.replace(
    /<link\b(?=[^>]*\brel=(["'])preload\1)(?=[^>]*\bas=(["'])image\2)(?=[^>]*cdn\.fastpixel\.io)[^>]*>/gi,
    "",
  );
  return result;
}

/**
 * FIX 5 - FastPixel moves the real background URL into data-fpo-lazybg and
 * leaves a placeholder in the style attribute. The previous version deleted the
 * attribute without restoring the URL, which silently dropped every CSS
 * background image (home-intro tiles, banner-page headers, escape section).
 */
function restoreLazyBackgrounds(html: string) {
  return html.replace(/<[a-z][a-z0-9-]*\b[^>]*\sdata-fpo-lazybg=(["'])(.*?)\1[^>]*>/gi, (tag) => {
    const raw = tag.match(/\sdata-fpo-lazybg=(["'])(.*?)\1/i)?.[2];
    let updated = tag.replace(/\sdata-fpo-lazybg=(["'])(.*?)\1/i, "");
    if (!raw) return updated;

    // The attribute is sometimes a JSON payload rather than a bare URL.
    const candidate = raw.trim().startsWith("{") || raw.trim().startsWith("[")
      ? (() => {
          try {
            const parsed = JSON.parse(raw.replace(/&quot;/g, '"'));
            const found = JSON.stringify(parsed).match(/https?:\\?\/\\?\/[^"\\]+/)?.[0];
            return found ? found.replace(/\\\//g, "/") : null;
          } catch {
            return null;
          }
        })()
      : raw;
    if (!candidate) return updated;

    const target = restoreAssetUrl(candidate);
    if (!/^(?:\/|https?:)/.test(target)) return updated;
    const declaration = `background-image:url('${target}')`;

    if (/\sstyle=(["'])/i.test(updated)) {
      return updated.replace(/\sstyle=(["'])(.*?)\1/i, (_m, quote: string, css: string) => {
        const cleaned = css.replace(/background-image\s*:\s*url\([^)]*\)\s*;?/gi, "").trim();
        const prefix = cleaned ? (cleaned.endsWith(";") ? cleaned : `${cleaned};`) : "";
        return ` style=${quote}${prefix}${declaration}${quote}`;
      });
    }
    return updated.replace(/\s*\/?>$/, ` style="${declaration}">`);
  });
}

function restoreThemeAssetsAndScripts(html: string) {
  // FastPixel/WP Meteor changes scripts to a non-executable MIME type and may
  // delay them for a full day. That prevents the original theme menu, sliders,
  // galleries and accordions from initializing on the Vercel frontend.
  // Also restore FastPixel URLs embedded inside inline CSS (@font-face,
  // background-image and flag sprites), not only src/href attributes.
  let result = restoreLazyBackgrounds(html);

  result = result.replace(
    /https:\/\/cdn\.fastpixel\.io\/fp\/[^/"'()\s<]+\/[^"'()\s<]+/gi,
    (url) => restoreAssetUrl(url),
  );

  result = result.replace(
    /<script\b(?=[^>]*\bid=["']fpo-[^"']+["'])[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );

  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => {
    const delayedSource = tag.match(/\sdata-wpmeteor-src=(["'])(.*?)\1/i)?.[2];
    let updated = tag;
    if (delayedSource) {
      updated = updated.replace(
        /\sdata-wpmeteor-src=(["'])(.*?)\1/i,
        ` src="${restoreAssetUrl(delayedSource)}"`,
      );
    }
    updated = updated
      .replace(/\sdata-wpmeteor-type=(["'])(.*?)\1/gi, "")
      .replace(/\stype=(["'])javascript\/blocked\1/gi, ' type="text/javascript"');
    return updated;
  });

  result = result.replace(/<link\b[^>]*>/gi, (tag) => {
    const href = tag.match(/\shref=(["'])(.*?)\1/i)?.[2];
    if (!href) return tag;
    return tag.replace(/\shref=(["'])(.*?)\1/i, ` href="${restoreAssetUrl(href)}"`);
  });

  return result
    .replace(/\sdata-fpo-(?:backgrounds|fonts|overrides|reduced|required)=(["'])(.*?)\1/gi, "")
    .replace(/\sdata-fpo-(?:backgrounds|fonts|overrides|reduced|required)(?=[\s>])/gi, "");
}

/**
 * FIX 6 - The injected click handler is gone. dsmart-child/js/main.js already
 * toggles `.open-menu` on `.menu .menu-item`; a second document-level listener
 * toggling the same class ran last and cancelled it out, so the mega menu never
 * stayed open. The over-aggressive rules (min-height:420px, width:100vw, and
 * forcing third-level sub-menus permanently visible) are gone too - they were
 * what broke the panel layout. What remains only makes the theme's own
 * `.open-menu` state visible, in case FastPixel stripped the original rule.
 */
function injectMenuCompatibility(html: string) {
  const style = `<style id="aat-menu-compat">
body .main-navigation ul.menu > li.menu-item-has-children.open-menu > .sub-menu-wrapper{
display:block;visibility:visible;opacity:1;z-index:9999;pointer-events:auto
}
body .main-navigation ul.menu > li.menu-item-has-children.open-menu > .sub-menu-wrapper > .container > ul.sub-menu{
display:flex;visibility:visible;opacity:1
}
</style>`;
  return html.includes("</head>") ? html.replace("</head>", `${style}</head>`) : html;
}

export async function GET(request: NextRequest) {
  const upstreamPath = request.nextUrl.pathname.replace(/^\/legacy/, "") || "/";
  const upstream = new URL(upstreamPath, `${wordpressOrigin()}/`);
  upstream.search = request.nextUrl.search;

  try {
    const isPreview = process.env.VERCEL_ENV !== "production";
    const response = await fetch(upstream, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        Host: "www.absoluteasiatours.com",
        "User-Agent": "AbsoluteAsia-Vercel-Renderer/2.0",
      },
      ...(isPreview
        ? { cache: "no-store" as const }
        : { next: { revalidate: 300, tags: ["wordpress-rendered"] } }),
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: { "Content-Type": contentType || "application/octet-stream" },
      });
    }

    let html = await response.text();
    html = rewriteInternalNavigation(html);
    // Order matters: images must be read while data-fpo-src still holds the
    // original FastPixel URL, before the global URL restore rewrites it.
    html = optimizeImagesWithVercel(html);
    html = restoreThemeAssetsAndScripts(html);
    html = injectMenuCompatibility(html);
    html = removePreviewRecaptchaError(html);
    html = addPreviewRobots(html);

    return new NextResponse(html, {
      status: response.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": response.ok && !isPreview
          ? "public, s-maxage=300, stale-while-revalidate=86400"
          : "no-store",
        "X-Absolute-Asia-Source": "wordpress-dsmart-baseline",
      },
    });
  } catch (error) {
    console.error("[wordpress-renderer] upstream fetch failed", {
      pathname: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(
      '<!doctype html><html><head><meta name="robots" content="noindex"></head><body><h1>Website temporarily unavailable</h1><p>Please try again shortly.</p></body></html>',
      {
        status: 502,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
