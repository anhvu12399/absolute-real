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

export function NativeHeader({
  logo,
  menu = [],
  phoneLabel = "Talk to an expert: ",
  phone = "+84 963 874 729",
}: {
  logo?: string;
  menu?: MenuItem[];
  phoneLabel?: string;
  phone?: string;
}) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const level0 = menu.filter((item) => item.parent === 0);

  const defaultLogo = "https://www.absoluteasiatours.com/wp-content/uploads/2024/07/cropped-Absolute-Asia-Tours-FINAL-03.png";
  const logoUrl = logo || defaultLogo;

  return (
    <header id="masthead" className="site-header header-4">
      <div className={`col-full-nav ${mobileNavOpen ? "mobile-toggled" : ""}`}>
        <div className="site-branding">
          <Link href="/" className="custom-logo-link" aria-label="Absolute Asia Tours Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Absolute Asia Tours" className="custom-logo" width={205} height={98} />
          </Link>
        </div>

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
                  const level1 = menu.filter((child) => child.parent === item0.id);
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
                    >
                      <Link href={toLocalHref(item0.url)} target={item0.target || undefined}>
                        <span>{item0.title}</span>
                      </Link>

                      {hasChildren && (
                        <div className="sub-menu-wrapper">
                          <div className="container">
                            <ul className="sub-menu">
                              {level1.map((item1) => {
                                const level2 = menu.filter((grandchild) => grandchild.parent === item1.id);
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
    </header>
  );
}
