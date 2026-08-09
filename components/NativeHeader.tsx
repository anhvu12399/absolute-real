"use client";

import { useState } from "react";
import Link from "next/link";
import type { MenuItem } from "@/lib/wp";

function toLocalHref(url?: string | null) {
  if (!url) return "#";
  const raw = url.trim();
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  try {
    const parsed = new URL(raw);
    if (/^(?:www\.)?absoluteasiatours\.com$/i.test(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/\.\//g, "/") || "/";
    }
    return raw;
  } catch {
    return raw;
  }
}

const DEFAULT_MENU: MenuItem[] = [
  // Roots
  { id: 1, parent: 0, title: "DESTINATIONS", url: "/destinations/", target: "", classes: [], order: 1 },
  { id: 2, parent: 0, title: "TRIP IDEAS", url: "/travel-ideas/", target: "", classes: [], order: 2 },
  { id: 3, parent: 0, title: "INSPIRATIONS", url: "/inspirations/", target: "", classes: [], order: 3 },
  { id: 4, parent: 0, title: "TAILOR-MADE", url: "/tailor-made-tours/", target: "", classes: [], order: 4 },
  { id: 5, parent: 0, title: "ABOUT US", url: "/about-us/", target: "", classes: [], order: 5 },

  // DESTINATIONS -> Level 1 & 2
  { id: 10, parent: 1, title: "SOUTHEAST ASIA", url: "/destinations/southeast-asia/", target: "", classes: [], order: 1 },
  { id: 101, parent: 10, title: "Vietnam Tours", url: "/vietnam-tours/", target: "", classes: [], order: 1 },
  { id: 102, parent: 10, title: "Cambodia Tours", url: "/cambodia-tours/", target: "", classes: [], order: 2 },
  { id: 103, parent: 10, title: "Thailand Tours", url: "/thailand-tours/", target: "", classes: [], order: 3 },
  { id: 104, parent: 10, title: "Laos Tours", url: "/laos-tours/", target: "", classes: [], order: 4 },
  { id: 105, parent: 10, title: "Bali Tours", url: "/bali-tours/", target: "", classes: [], order: 5 },
  { id: 106, parent: 10, title: "Philippines Tours", url: "/philippines-tours/", target: "", classes: [], order: 6 },

  { id: 11, parent: 1, title: "INDIA & THE HIMALAYAS", url: "/destinations/india-himalayas/", target: "", classes: [], order: 2 },
  { id: 111, parent: 11, title: "India Tours", url: "/india-tours/", target: "", classes: [], order: 1 },
  { id: 112, parent: 11, title: "Nepal Tours", url: "/nepal-tours/", target: "", classes: [], order: 2 },
  { id: 113, parent: 11, title: "Bhutan Tours", url: "/bhutan-tours/", target: "", classes: [], order: 3 },
  { id: 114, parent: 11, title: "Sri Lanka Tours", url: "/sri-lanka-tours/", target: "", classes: [], order: 4 },
  { id: 115, parent: 11, title: "Tibet Tours", url: "/tibet-tours/", target: "", classes: [], order: 5 },

  { id: 12, parent: 1, title: "NORTH ASIA", url: "/destinations/north-asia/", target: "", classes: [], order: 3 },
  { id: 121, parent: 12, title: "Japan Tours", url: "/japan-tours/", target: "", classes: [], order: 1 },
  { id: 122, parent: 12, title: "China Tours", url: "/china-tours/", target: "", classes: [], order: 2 },
  { id: 123, parent: 12, title: "South Korea Tours", url: "/south-korea-tours/", target: "", classes: [], order: 3 },

  // TRIP IDEAS -> Level 1 & 2
  { id: 20, parent: 2, title: "BY EXPERIENCE", url: "/travel-ideas/", target: "", classes: [], order: 1 },
  { id: 201, parent: 20, title: "Luxury Honeymoon", url: "/trip-ideas/luxury-honeymoon/", target: "", classes: [], order: 1 },
  { id: 202, parent: 20, title: "Family Vacations", url: "/trip-ideas/family-vacations/", target: "", classes: [], order: 2 },
  { id: 203, parent: 20, title: "Cultural Heritage", url: "/trip-ideas/cultural-heritage/", target: "", classes: [], order: 3 },
  { id: 204, parent: 20, title: "Beach Escapes", url: "/trip-ideas/beach-escapes/", target: "", classes: [], order: 4 },

  // INSPIRATIONS -> Level 1 & 2
  { id: 30, parent: 3, title: "TRAVEL INSPIRATIONS", url: "/inspirations/", target: "", classes: [], order: 1 },
  { id: 301, parent: 30, title: "Best Time to Visit", url: "/inspiration/best-time-to-visit/", target: "", classes: [], order: 1 },
  { id: 302, parent: 30, title: "Multi-Country Tours", url: "/inspiration/multi-country/", target: "", classes: [], order: 2 },
  { id: 303, parent: 30, title: "Luxury Cruises", url: "/inspiration/luxury-cruises/", target: "", classes: [], order: 3 },

  // ABOUT US -> Level 1 & 2
  { id: 50, parent: 5, title: "ABOUT ABSOLUTE ASIA", url: "/about-us/", target: "", classes: [], order: 1 },
  { id: 501, parent: 50, title: "Our Story & Vision", url: "/about-us/", target: "", classes: [], order: 1 },
  { id: 502, parent: 50, title: "Meet The Team", url: "/meet-the-team/", target: "", classes: [], order: 2 },
  { id: 503, parent: 50, title: "Client Reviews", url: "/reviews/", target: "", classes: [], order: 3 },
];

export function NativeHeader({
  logo,
  menu = [],
  phoneLabel = "Call Us: ",
  phone = "+1 315 998 1998",
}: {
  logo?: string;
  menu?: MenuItem[];
  phoneLabel?: string;
  phone?: string;
}) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeMenu = menu.length > 0 ? menu : DEFAULT_MENU;
  const level0 = activeMenu.filter((item) => item.parent === 0);

  const defaultLogo = "https://www.absoluteasiatours.com/wp-content/uploads/2024/07/cropped-Absolute-Asia-Tours-FINAL-03.png";
  const logoUrl = logo || defaultLogo;

  return (
    <div className="header-wrapper" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
      <header id="masthead" className="site-header">
        <div className="menu-overlay"></div>
        <div className="main-header col-full">
          <div className="site-branding">
            <Link href="/" className="custom-logo-link" aria-label="Absolute Asia Tours Home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Absolute Asia Tours" className="custom-logo" width={205} height={98} />
            </Link>
          </div>
        </div>
      </header>

      <div className={`col-full-nav ${mobileNavOpen ? "mobile-toggled" : ""}`}>
        <button
          type="button"
          className="menu-toggle"
          aria-controls="site-navigation"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <span className="screen-reader-text">Menu</span>
          <i className="fas fa-bars" aria-hidden="true" />
        </button>

        <nav id="site-navigation" className={`main-navigation hover-intent ${mobileNavOpen ? "toggled" : ""}`} aria-label="Primary Navigation">
          <div className="primary-navigation">
            <div className="menu-primary-menu-container">
              <ul className="menu">
                {level0.map((item0) => {
                  const level1 = activeMenu.filter((child) => child.parent === item0.id);
                  const hasChildren = level1.length > 0;
                  const isOpen = openMenuId === item0.id;

                  return (
                    <li
                      key={item0.id}
                      className={`menu-item ${hasChildren ? "menu-item-has-children" : ""} ${
                        isOpen ? "open-menu" : ""
                      }`}
                      onMouseEnter={() => hasChildren && setOpenMenuId(item0.id)}
                      onMouseLeave={() => hasChildren && setOpenMenuId(null)}
                      onClick={(e) => {
                        if (hasChildren) {
                          setOpenMenuId(isOpen ? null : item0.id);
                        }
                      }}
                    >
                      <Link
                        href={toLocalHref(item0.url)}
                        target={item0.target || undefined}
                        onClick={(e) => {
                          if (hasChildren) {
                            // On click, if it has a submenu, toggle the dropdown instead of page jump
                            setOpenMenuId(isOpen ? null : item0.id);
                          }
                        }}
                      >
                        <span>{item0.title}</span>
                        {hasChildren && <i className="fas fa-chevron-down nav-arrow" aria-hidden="true" />}
                      </Link>

                      {hasChildren && (
                        <div className="sub-menu-wrapper">
                          <div className="container">
                            <ul className="sub-menu">
                              {level1.map((item1) => {
                                const level2 = activeMenu.filter((grandchild) => grandchild.parent === item1.id);
                                const hasSubChildren = level2.length > 0;

                                return (
                                  <li
                                    key={item1.id}
                                    className={`menu-item ${hasSubChildren ? "menu-item-has-children" : ""}`}
                                  >
                                    <Link href={toLocalHref(item1.url)} target={item1.target || undefined}>
                                      <span>{item1.title}</span>
                                    </Link>
                                    {hasSubChildren && (
                                      <ul className="sub-menu">
                                        {level2.map((item2) => (
                                          <li key={item2.id} className="menu-item">
                                            <Link href={toLocalHref(item2.url)} target={item2.target || undefined}>
                                              <span>{item2.title}</span>
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>

        <div className="right-nav">
          <p>
            {phoneLabel}
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
              <span>{phone}</span>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
