"use client";

import Link from "next/link";
import { BRAND_NAME } from "@/lib/site";
import type { SitePayload } from "@/lib/wp";

/**
 * The three things a traveller on a phone actually wants within reach:
 * a human on WhatsApp, the enquiry form, and the phone number. Fixed to the
 * bottom of the screen only below the header's own mobile breakpoint (760px)
 * — on a desktop the header already carries a call and a plan-your-journey
 * action, so a second copy pinned to the viewport would be redundant chrome.
 *
 * Same lacquer-and-gold surface as the header: this is the other end of the
 * same object, not a different UI bolted underneath the site.
 */
export function MobileActionBar({ site }: { site?: SitePayload | null }) {
  const phone = (site?.phone || "").trim();
  const whatsapp = (
    (site?.whatsapp || "").trim() ||
    phone ||
    process.env.NEXT_PUBLIC_BRAND_WHATSAPP ||
    process.env.NEXT_PUBLIC_BRAND_PHONE ||
    ""
  ).replace(/\D/g, "");

  const message = encodeURIComponent(
    `Hello ${BRAND_NAME}, I would like to inquire about planning a private luxury journey.`,
  );

  /* No last-resort number here either — see WhatsAppButton for why a
     fallback that belongs to nobody is worse than the action not appearing. */
  const items = [
    whatsapp.length >= 8 && {
      key: "chat",
      icon: "i-chat",
      label: "Chat",
      href: `https://wa.me/${whatsapp}?text=${message}`,
      external: true,
    },
    {
      key: "enquire",
      icon: "i-enquire",
      label: "Enquire",
      href: "/plan-my-trip/#form",
      external: false,
    },
    phone && {
      key: "call",
      icon: "i-phone",
      label: "Call",
      href: `tel:${phone.replace(/[^\d+]/g, "")}`,
      external: false,
    },
  ].filter(Boolean) as Array<{ key: string; icon: string; label: string; href: string; external: boolean }>;

  return (
    <nav className="mobile-action-bar" aria-label="Quick contact">
      {items.map((item) =>
        item.external ? (
          <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer" className="mobile-action-item">
            <svg aria-hidden="true"><use href={`#${item.icon}`} /></svg>
            <span>{item.label}</span>
          </a>
        ) : (
          <Link key={item.key} href={item.href} className="mobile-action-item">
            <svg aria-hidden="true"><use href={`#${item.icon}`} /></svg>
            <span>{item.label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
