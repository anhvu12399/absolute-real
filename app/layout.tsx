import type { Metadata } from "next";
import { NativeHeader } from "@/components/NativeHeader";
import { NativeFooter } from "@/components/NativeFooter";
import { getSiteData } from "@/lib/wp";

import "./globals.css";
import "./theme/main.css";
import "./theme/plus_V.css";
import "./theme/plus_T.css";
import "./theme/plus.css";
import "./theme/responsive_V.css";
import "./theme/responsive_T.css";
import "./theme/responsive.css";
import "./native.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.absoluteasiatours.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Private Asia Luxury Tours | Absolute Asia Tours", template: "%s | Absolute Asia Tours" },
  description: "Private, tailor-made journeys across Asia, designed by local travel experts.",
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let siteData = null;
  try {
    siteData = await getSiteData();
  } catch {
    siteData = null;
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Mulish:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="home page-template-default header-4">
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <NativeHeader
          logo={siteData?.logo}
          menu={siteData?.menu || []}
          phoneLabel={siteData?.phoneLabel || "Talk to an expert"}
          phone={siteData?.phone || "+84 963 874 729"}
        />
        <div id="content">{children}</div>
        <NativeFooter blocks={siteData?.footer || {}} />
      </body>
    </html>
  );
}
