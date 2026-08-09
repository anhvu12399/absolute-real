import { NextRequest, NextResponse } from "next/server";

// Pixel-accurate migration baseline: WordPress still renders templates that have
// not passed visual parity. Native Next.js templates replace these routes one by
// one only after screenshot and SEO comparison.

const DEFAULT_ORIGIN = "https://origin.absoluteasiatours.com";

function wordpressOrigin() {
  return (process.env.WORDPRESS_RENDER_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
}

function rewriteInternalNavigation(html: string, previewOrigin: string) {
  const productionHosts = [
    "https://www.absoluteasiatours.com",
    "https://absoluteasiatours.com",
    "http://www.absoluteasiatours.com",
    "http://absoluteasiatours.com",
  ];

  return productionHosts.reduce((result, host) => {
    const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result.replace(
      new RegExp(`(<a\\b[^>]*?href=["'])${escaped}(?=\\/|["'])`, "gi"),
      `$1${previewOrigin}`,
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
    .replace(
      /<script\b(?=[^>]*\bid=["']wpforms-recaptcha-js["'])[^>]*>[\s\S]*?<\/script>/gi,
      "",
    )
    .replace(
      /<script\b(?=[^>]*\bid=["']wpforms-recaptcha-js-after["'])[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
}

function restoreAssetUrl(value: string, previewOrigin: string) {
  const decodedValue = value.replace(/&amp;/g, "&");
  const accelerated = decodedValue.match(
    /^https:\/\/cdn\.fastpixel\.io\/fp\/[^/]+\/(.+)$/i,
  );

  let restored = decodedValue;
  if (accelerated) {
    try {
      restored = `https://${decodeURIComponent(accelerated[1])}`;
    } catch {
      restored = decodedValue;
    }
  }

  try {
    const url = new URL(restored);
    if (/^(?:www\.)?absoluteasiatours\.com$/i.test(url.hostname)) {
      return `${previewOrigin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {}
  return restored;
}

function restoreThemeAssetsAndScripts(html: string, previewOrigin: string) {
  // FastPixel/WP Meteor changes scripts to a non-executable MIME type and may
  // delay them for a full day. That prevents the original theme menu, sliders,
  // galleries and accordions from initializing on the Vercel frontend.
  // Also restore FastPixel URLs embedded inside inline CSS (@font-face,
  // background-image and flag sprites), not only src/href attributes.
  let result = html.replace(
    /https:\/\/cdn\.fastpixel\.io\/fp\/[^/"'()\s<]+\/[^"'()\s<]+/gi,
    (url) => restoreAssetUrl(url, previewOrigin),
  );

  result = result.replace(
    /<script\b(?=[^>]*\bid=["']fpo-[^"']+["'])[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );

  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => {
    const delayedSource = tag.match(/\sdata-wpmeteor-src=(["'])(.*?)\1/i)?.[2];
    let updated = tag;
    if (delayedSource) {
      const source = restoreAssetUrl(delayedSource, previewOrigin);
      updated = updated.replace(/\sdata-wpmeteor-src=(["'])(.*?)\1/i, ` src="${source}"`);
    }
    updated = updated
      .replace(/\sdata-wpmeteor-type=(["'])(.*?)\1/gi, "")
      .replace(/\stype=(["'])javascript\/blocked\1/gi, ' type="text/javascript"');
    return updated;
  });

  result = result.replace(/<link\b[^>]*>/gi, (tag) => {
    const href = tag.match(/\shref=(["'])(.*?)\1/i)?.[2];
    if (!href) return tag;
    return tag.replace(
      /\shref=(["'])(.*?)\1/i,
      ` href="${restoreAssetUrl(href, previewOrigin)}"`,
    );
  });

  // Backgrounds already contain their original WordPress URL; only the
  // FastPixel marker remains after its loader is removed.
  return result
    .replace(/\sdata-fpo-(?:lazybg|backgrounds|fonts|overrides|reduced|required)=(["'])(.*?)\1/gi, "")
    .replace(/\sdata-fpo-(?:lazybg|backgrounds|fonts|overrides|reduced|required)(?=[\s>])/gi, "");
}

function injectMenuCompatibility(html: string) {
  const style = `<style id="aat-menu-compat">
@media (min-width:993px){
body .main-navigation.hover-intent ul.menu>li.menu-item-has-children:hover>.sub-menu-wrapper,
body .main-navigation ul.menu>li.menu-item-has-children.aat-menu-open>.sub-menu-wrapper{
display:block!important;visibility:visible!important;opacity:1!important;z-index:9999!important;transform:scale(1)!important;pointer-events:auto!important;width:100vw!important;left:0!important;right:0!important
}
body .main-navigation ul.menu>li.menu-item-has-children:hover>.sub-menu-wrapper>.container>ul.sub-menu,
body .main-navigation ul.menu>li.menu-item-has-children.aat-menu-open>.sub-menu-wrapper>.container>ul.sub-menu,
body .main-navigation ul.menu>li.menu-item-has-children.open-menu>.sub-menu-wrapper>.container>ul.sub-menu{
display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;left:0!important;top:0!important;width:100vw!important;min-height:420px!important;height:auto!important;overflow:visible!important
}
body .main-navigation ul.menu>li>.sub-menu-wrapper>.container>ul.sub-menu>li>.sub-menu-wrapper,
body .main-navigation ul.menu>li>.sub-menu-wrapper>.container>ul.sub-menu>li>.sub-menu-wrapper>div>ul.sub-menu{
display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:0!important;top:0!important;height:auto!important
}
}
body .main-navigation ul.menu li.menu-item-has-children.aat-menu-open>.sub-menu-wrapper,
body .main-navigation ul.menu li.menu-item-has-children.open-menu>.sub-menu-wrapper{
display:block!important;visibility:visible!important;opacity:1!important;z-index:9999!important;pointer-events:auto!important
}
</style>`;
  const script = `<script id="aat-menu-compat-js">
document.addEventListener("click",function(event){
var trigger=event.target.closest(".main-navigation li.menu-item-has-children > .caret,.main-navigation li.menu-item-has-children > a:not([href])");
if(!trigger)return;
event.preventDefault();event.stopPropagation();
var item=trigger.closest("li.menu-item-has-children");
var wasOpen=item.classList.contains("aat-menu-open");
item.parentElement.querySelectorAll(":scope > li.aat-menu-open").forEach(function(el){el.classList.remove("aat-menu-open","open-menu")});
if(!wasOpen)item.classList.add("aat-menu-open","open-menu");
});
document.addEventListener("click",function(event){
if(!event.target.closest(".main-navigation"))document.querySelectorAll(".main-navigation .aat-menu-open").forEach(function(el){el.classList.remove("aat-menu-open","open-menu")});
});
</script>`;
  let result = html.includes("</head>") ? html.replace("</head>", `${style}</head>`) : html;
  return result.includes("</body>") ? result.replace("</body>", `${script}</body>`) : result;
}

function originalImageUrl(fastPixelUrl: string) {
  try {
    const decoded = decodeURIComponent(fastPixelUrl);
    const match = decoded.match(
      /\/(www\.absoluteasiatours\.com|absoluteasiatours\.com|amazingbiketours\.com)(\/[^?#\s"']+)/i,
    );
    return match ? `https://${match[1]}${match[2]}` : fastPixelUrl;
  } catch {
    return fastPixelUrl;
  }
}

function optimizeImagesWithVercel(html: string) {
  const widths = [320, 480, 640, 750, 828, 1080, 1200, 1600, 1920];
  let result = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const source = tag.match(/\sdata-fpo-src=(["'])(.*?)\1/i)?.[2];
    if (!source) return tag;

    const original = originalImageUrl(source.replace(/&amp;/g, "&"));
    if (
      !/^https:\/\/(?:www\.)?absoluteasiatours\.com\//i.test(original) &&
      !/^https:\/\/amazingbiketours\.com\//i.test(original)
    ) return tag;

    // Vercel intentionally rejects SVG optimization. Keep SVG/GIF and other
    // vector/animated assets on their original URL so icons never become a
    // broken-image question mark.
    if (!/\.(?:avif|jpe?g|png|webp)(?:[?#]|$)/i.test(original)) {
      return tag
        .replace(/\ssrc=(["'])(.*?)\1/i, ` src="${original}"`)
        .replace(/\sdata-fpo-src=(["'])(.*?)\1/i, "")
        .replace(/\sdata-fpo-sources=(["'])(.*?)\1/i, "")
        .replace(/\ssrcset=(["'])(.*?)\1/i, "")
        .replace(/\ssizes=(["'])(.*?)\1/i, "")
        .replace(/\sloading=(["'])(.*?)\1/i, "")
        .replace(/\sdecoding=(["'])(.*?)\1/i, "")
        .replace(/>$/, ' loading="lazy" decoding="async">');
    }

    const declaredWidth = Number(tag.match(/\swidth=(["'])(\d+)\1/i)?.[2] || 1920);
    const maximumWidth = Math.min(Math.max(declaredWidth, 640), 1920);
    const candidates = widths.filter((width) => width <= maximumWidth);
    if (!candidates.includes(maximumWidth)) candidates.push(maximumWidth);
    const srcset = [...new Set(candidates)]
      .sort((a, b) => a - b)
      .map((width) => {
        const optimized = `/_next/image/?url=${encodeURIComponent(original)}&w=${width}&q=75`;
        return `${optimized.replace(/&/g, "&amp;")} ${width}w`;
      })
      .join(", ");

    let updated = tag
      .replace(/\ssrc=(["'])(.*?)\1/i, ` src="${original}"`)
      .replace(/\sdata-fpo-src=(["'])(.*?)\1/i, "")
      .replace(/\sdata-fpo-sources=(["'])(.*?)\1/i, "")
      .replace(/\sloading=(["'])(.*?)\1/i, "")
      .replace(/\ssrcset=(["'])(.*?)\1/i, "")
      .replace(/\ssizes=(["'])(.*?)\1/i, "")
      .replace(/\sdecoding=(["'])(.*?)\1/i, "");

    const priority = /\b(?:custom-logo|img-banner|swiper-slide-active)\b/i.test(updated);
    const compactImage = /\b(?:avatar|social|icon|custom-logo)\b/i.test(updated);
    const sizes = compactImage
      ? "(max-width: 768px) 96px, 180px"
      : declaredWidth <= 400
      ? `${declaredWidth}px`
      : `(max-width: 768px) 100vw, ${Math.min(declaredWidth, 1920)}px`;
    updated = updated.replace(
      />$/,
      ` srcset="${srcset}" sizes="${sizes}" loading="${priority ? "eager" : "lazy"}" decoding="async"${priority ? ' fetchpriority="high"' : ""}>`,
    );
    return updated;
  });

  result = result.replace(
    /<link\b(?=[^>]*\brel=(["'])preload\1)(?=[^>]*\bas=(["'])image\2)(?=[^>]*cdn\.fastpixel\.io)[^>]*>/gi,
    "",
  );
  return result;
}

export async function GET(request: NextRequest) {
  const upstream = new URL(request.nextUrl.pathname, `${wordpressOrigin()}/`);
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
    html = rewriteInternalNavigation(html, request.nextUrl.origin);
    html = restoreThemeAssetsAndScripts(html, request.nextUrl.origin);
    html = optimizeImagesWithVercel(html);
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
