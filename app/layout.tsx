import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { V2Header } from "@/components/v2/V2Header";
import { V2Footer } from "@/components/v2/V2Footer";
import { V2Icons } from "@/components/v2/V2Icons";
import { RevealInit } from "@/components/v2/RevealWrapper";
import { AdminPreviewBridge } from "@/components/v2/AdminPreviewBridge";
import { PageProgressBar } from "@/components/v2/PageProgressBar";
import { WhatsAppButton } from "@/components/v2/WhatsAppButton";
import { MobileActionBar } from "@/components/v2/MobileActionBar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteDataSafe } from "@/lib/wp";

import "./v2.css";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { organizationSchema, schemaScript, websiteSchema } from "@/lib/schema";
import { WP_ORIGIN } from "@/lib/wp-origin";

const siteUrl = SITE_URL;


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  /* Matches --chrome: the browser chrome on mobile should be the same
     lacquer black as the menu it sits above. */
  themeColor: "#171110",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: SITE_TITLE, template: `%s | ${BRAND_NAME}` },
  description: SITE_DESCRIPTION,
  /* Google & AI Crawlers image and rich snippet directives */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    siteName: BRAND_NAME,
    locale: "en_US",
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteDataSafe();

  return (
    <html lang="en">
      <head>
        {/* The two faces every page sets its type in. They are declared inside
            a 99KB stylesheet, so the browser only learns they exist once that
            file has downloaded and parsed — two round trips before the first
            word can be painted in the right face. Only the latin subsets are
            preloaded; the Vietnamese and extended ranges load on demand. */}
        <link rel="preload" as="font" type="font/woff2" href="/fonts/playfair-latin.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/work-sans-latin.woff2" crossOrigin="anonymous" />
        {WP_ORIGIN && (
          <>
            <link rel="dns-prefetch" href={WP_ORIGIN} />
            <link rel="preconnect" href={WP_ORIGIN} crossOrigin="anonymous" />
          </>
        )}
        {/* Organization and WebSite, once site-wide. Page-level schema is
            emitted by the route so each type describes itself. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: schemaScript(
              organizationSchema({
                logo: site?.logo,
                phone: site?.phone,
                description: site?.description || SITE_DESCRIPTION,
              }),
              websiteSchema(),
            )!,
          }}
        />
      </head>
      <body>
        <V2Icons />
        <V2Header site={site} />
        <main id="top">{children}</main>
        <V2Footer site={site} />
        {/* `.reveal` starts invisible; without this a server-rendered template
            publishes a blank page. Mounted here so no route can miss it. */}
        <RevealInit />
        <Suspense><AdminPreviewBridge /></Suspense>
        <Suspense><PageProgressBar /></Suspense>
        <WhatsAppButton site={site} />
        <MobileActionBar site={site} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
