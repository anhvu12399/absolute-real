"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { SitePayload } from "@/lib/wp";
import { resolveSections } from "./navigation";
import { BRAND_NAME } from "@/lib/site";
import type { NavSection } from "./navigation";
import { optimized } from "@/lib/images";

/** A section with no links of its own has no panel worth opening. */
function hasPanel(section: NavSection) {
  return section.columns.some((column) => column.length > 0) || Boolean(section.secondary?.length);
}

export function V2Header({ site }: { site?: SitePayload | null }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const sections = resolveSections(site);
  const phone = site?.phone || "+1 (212) 627-1950";
  const phoneLabel = site?.phoneLabel || "Speak with an Asia designer";

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu((prev) => (prev === name ? null : name));
  };

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
      // Auto-close open menu when scrolling down
      setOpenMenu(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const nav = document.getElementById("siteNav");
      if (nav && !nav.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <div className="utility-bar">
        <div className="container utility-inner">
          <div className="utility-left">
            <svg><use href="#i-phone"></use></svg>
            <span>{phoneLabel}&nbsp; <strong>{phone}</strong></span>
          </div>
          <div className="utility-right">
            <span>Mon–Sat, 8am–8pm ET</span>
            <Link href="/about-us/">About Us</Link>
            <Link href="/inspirations/">Travel Inspiration</Link>
          </div>
        </div>
      </div>

      <nav className={`site-nav${isScrolled ? " is-scrolled" : ""}`} id="siteNav">
        <div className="container nav-inner">
          <Link href="/" className="brand-mark" onClick={closeAll}>
            {/* The mark comes from WordPress (Appearance → Customize → Site
                Identity). Until one is set, the seal below stands in - it uses
                the brand's own gold rather than pretending to be the logo. */}
            {site?.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="brand-logo" src={optimized(site.logo, 240)} alt={site?.name || BRAND_NAME} />
            ) : (
              <span className="seal">A</span>
            )}
            <span className="brand-text">
              <span className="name">{site?.name || BRAND_NAME}</span>
              <span className="tag">Private | Luxury | Journeys</span>
            </span>
          </Link>

          <ul className="nav-links">
            {sections.map((section) => (
              <li className={`nav-item-dropdown${hasPanel(section) ? " nav-item-mega" : ""}`} key={section.key}>
                {/* A top-level item with nothing under it - Tailor-Made - is a
                    link, not a toggle. It used to open an empty panel and
                    swallow the click. */}
                {hasPanel(section) ? (
                  <a href={section.href} onClick={(e) => toggleMenu(section.key, e)} style={{ cursor: "pointer" }}>
                    {section.label} <span className="caret">▾</span>
                  </a>
                ) : (
                  <Link href={section.href} onClick={closeAll}>{section.label}</Link>
                )}
                {hasPanel(section) && (
                <div className={`dropdown-menu mega-menu-full ${openMenu === section.key ? "is-open" : ""}`}>
                  <div className="container mega-menu-full-inner">
                    <div className="mega-col-double">
                      <h3 className="mega-section-title">{section.sectionTitle}</h3>
                      <div className="mega-subcols">
                        {section.columns.map((column, idx) => (
                          <div className="mega-subcol" key={idx}>
                            {column.map((link) => (
                              <Link href={link.href} onClick={closeAll} key={link.href + link.label}>
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                      {section.ctaLabel && (
                        <div className="mega-btn-wrap">
                          <Link href={section.href} onClick={closeAll} className="mega-outline-btn">
                            {section.ctaLabel}
                          </Link>
                        </div>
                      )}
                    </div>

                    {section.secondary?.length ? (
                      <div className="mega-col-single">
                        <h3 className="mega-section-title mega-title-gold">{section.secondaryTitle}</h3>
                        <div className="mega-sublinks-vertical">
                          {section.secondary.map((link) => (
                            <Link href={link.href} onClick={closeAll} key={link.href + link.label}>
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {section.featuredTitle && (
                      <div className="mega-col-featured">
                        <div className="mega-featured-head">
                          <Link href={section.featuredHref || section.href} onClick={closeAll}>
                            {section.featuredEyebrow}
                          </Link>
                        </div>
                        <div className="mega-featured-card">
                          <Link href={section.featuredHref || section.href} onClick={closeAll} className="mega-featured-link">
                            <p className="mega-featured-title">{section.featuredTitle}</p>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <Link href="/#plan" className="btn btn-fill-ink" onClick={closeAll}>Plan Your Journey</Link>
            <button className="nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}>
              <svg><use href="#i-menu"></use></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE MENU ═══ */}
      <div className={`mobile-menu${mobileOpen ? " open" : ""}`} id="mobileMenu">
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <svg><use href="#i-close"></use></svg>
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "80vh", overflowY: "auto" }}>
          <Link href="/" onClick={closeAll}>Homepage</Link>

          {sections.map((section) => (
            <div key={section.key}>
              <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--celadon-pale)" }}>
                {section.label}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingLeft: "1rem", marginTop: "0.4rem" }}>
                {section.columns.flat().map((link) => (
                  <Link href={link.href} onClick={closeAll} key={link.href + link.label} style={{ fontSize: "1rem" }}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <Link href="/#plan" className="btn btn-fill-ink" onClick={closeAll}>Plan My Trip</Link>
        </div>
      </div>
    </>
  );
}
