import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { V2Header } from "@/components/v2/V2Header";
import { V2Footer } from "@/components/v2/V2Footer";
import { V2Icons } from "@/components/v2/V2Icons";
import { RevealInit } from "@/components/v2/RevealWrapper";
import { AdminPreviewBridge } from "@/components/v2/AdminPreviewBridge";
import { PageProgressBar } from "@/components/v2/PageProgressBar";
import { getSiteDataSafe } from "@/lib/wp";

import "./v2.css";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { organizationSchema, schemaScript, websiteSchema } from "@/lib/schema";

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
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteDataSafe();

  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://backend.absoluteasiatours.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Work+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
      </body>
    </html>
  );
}
