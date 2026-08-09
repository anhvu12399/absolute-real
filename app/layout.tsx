import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.absoluteasiatours.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Private Asia Luxury Tours | Absolute Asia Tours", template: "%s | Absolute Asia Tours" },
  description: "Private, tailor-made journeys across Asia, designed by local travel experts.",
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
