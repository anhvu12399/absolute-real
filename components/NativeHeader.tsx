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
  phoneLabel = "Talk to an expert",
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

  const toggleSubmenu = (id: number) => {
    setOpenMenuId((current) => (current === id ? null : id));
  };

  return (
    <header id="header-site" className="site-header native-header">
      <div className="header-main">
        <div className="container header-inner">
          <div className="site-branding">
            <Link href="/" className="custom-logo-link" aria-label="Absolute Asia Tours Home">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Absolute Asia Tours" className="custom-logo" width={205} height={98} />
              ) : (
                <span className="site-title">ABSOLUTE ASIA TOURS</span>
              )}
            </Link>
          </div>

          <button
            type="button"
            className={`menu-toggle ${mobileNavOpen ? "active" : ""}`}
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>

          <nav className={`main-navigation ${mobileNavOpen ? "mobile-active" : ""}`} aria-label="Main Navigation">
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
                      {item0.title}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        className="sub-menu-toggle"
                        aria-label={`Toggle ${item0.title} submenu`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleSubmenu(item0.id);
                        }}
                      >
                        <i className="fas fa-chevron-down" aria-hidden="true" />
                      </button>
                    )}

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
                                    {item1.title}
                                  </Link>
                                  {hasSubChildren && (
                                    <ul className="sub-menu">
                                      {level2.map((item2) => (
                                        <li key={item2.id} className="menu-item">
                                          <Link href={toLocalHref(item2.url)} target={item2.target || undefined}>
                                            {item2.title}
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
          </nav>

          {phone && (
            <div className="header-contact native-phone">
              <small>{phoneLabel}</small>
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
