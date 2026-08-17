"use client";

import { BRAND_NAME } from "@/lib/site";
import { useEffect, useState } from "react";
import type { SitePayload } from "@/lib/wp";

export function WhatsAppButton({ site }: { site?: SitePayload | null }) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    // Delay mounting slightly so it never blocks LCP or critical CSS render
    const timer = setTimeout(() => setMounted(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  // Determine phone number (configured via env or site payload, formatted for WhatsApp)
  const rawNumber =
    process.env.NEXT_PUBLIC_BRAND_WHATSAPP ||
    process.env.NEXT_PUBLIC_BRAND_PHONE ||
    site?.phone ||
    "+12126271950";

  // Clean number for WhatsApp international URL: keep only digits
  const cleanNumber = rawNumber.replace(/\D/g, "");
  const defaultMessage = encodeURIComponent(
    `Hello ${BRAND_NAME}, I would like to inquire about planning a private luxury journey.`
  );
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${defaultMessage}`;

  return (
    <aside
      className="whatsapp-floating-wrap"
      aria-label="WhatsApp Concierge"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`whatsapp-tooltip ${hovered ? "is-visible" : ""}`} role="tooltip">
        <div className="whatsapp-tooltip-header">
          <span className="whatsapp-status-dot" aria-hidden="true" />
          <span className="whatsapp-tooltip-name">Private Travel Concierge</span>
        </div>
        <p className="whatsapp-tooltip-msg">
          Speak with our Asia destination specialist on WhatsApp
        </p>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-floating-btn"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <span className="whatsapp-pulse-ring" aria-hidden="true" />
        <span className="whatsapp-pulse-ring-2" aria-hidden="true" />
        
        {/* Crisp Official WhatsApp SVG Icon */}
        <svg
          className="whatsapp-icon"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16 2C8.268 2 2 8.268 2 16c0 2.657.738 5.143 2.023 7.265L2.6 29.4l6.326-1.385A13.924 13.924 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M23.16 19.82c-.31-.155-1.83-.902-2.115-1.006-.284-.103-.49-.155-.697.155-.207.31-.8 1.006-.98 1.213-.18.207-.362.233-.672.078-.31-.155-1.309-.482-2.493-1.538-.922-.822-1.545-1.838-1.726-2.148-.18-.31-.02-.478.135-.632.14-.14.31-.362.465-.543.155-.18.207-.31.31-.517.103-.207.052-.388-.026-.543-.077-.155-.697-1.68-.955-2.302-.251-.605-.506-.523-.697-.533l-.594-.01c-.207 0-.543.078-.827.388-.284.31-1.085 1.06-1.085 2.585 0 1.525 1.111 2.999 1.266 3.206.155.207 2.185 3.336 5.293 4.678.74.32 1.317.51 1.767.654.743.236 1.419.203 1.954.123.596-.089 1.83-.748 2.088-1.47.258-.722.258-1.342.18-1.471-.077-.13-.284-.207-.594-.362z"
            fill="#ffffff"
          />
        </svg>

        <span className="whatsapp-floating-label">WhatsApp</span>
      </a>
    </aside>
  );
}

export default WhatsAppButton;
