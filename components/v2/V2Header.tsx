"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "./BrandMark";
import type { SitePayload } from "@/lib/wp";
import { resolveSections } from "./navigation";
import Image from "next/image";
import { BRAND_LOGO_SOURCE, BRAND_NAME, isDoomedUpload } from "@/lib/site";
import type { NavSection } from "./navigation";

/** A section with no links of its own has no panel worth opening. */
function hasPanel(section: NavSection) {
  return section.columns.some((column) => column.length > 0) || Boolean(section.secondary?.length);
}

export function V2Header({ site }: { site?: SitePayload | null }) {
  /* The bundled mark, unless this deployment says its logo lives in the CMS.
     A WordPress logo on the public domain's /wp-content/ is dropped either
     way: it resolves today and 404s the moment that domain points here. */
  const logo = BRAND_LOGO_SOURCE === "wordpress" && !isDoomedUpload(site?.logo) ? site?.logo : null;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);

  const sections = resolveSections(site);
  const phone = site?.phone || "+1 (212) 627-1950";
  const phoneLabel = site?.phoneLabel || "Call Us:";

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu((prev) => (prev === name ? null : name));
  };

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
    setOpenMobileSection(null);
  };

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
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
            {/* The mark is drawn, not fetched. WordPress held it as a 765x547
                PNG that the header displays at 40 - soft at every size, and
                carrying a second copy of the company name that the type beside
                it already says. The full logo still goes to Google through the
                Organization schema, where the wordmark belongs. */}
            {logo ? (
              <Image className="brand-logo" src={logo} width={240} height={80} sizes="(max-width: 760px) 108px, 132px" alt={site?.name || BRAND_NAME} />
            ) : (
              <BrandMark size={40} className="brand-logo" />
            )}
            <span className="brand-text">
              <span className="name">{site?.name || BRAND_NAME}</span>
              <span className="tag">Private | Luxury | Journeys</span>
            </span>
          </Link>

          <ul className="nav-links">
            {sections.map((section) => (
              <li className={`nav-item-dropdown${hasPanel(section) ? " nav-item-mega" : ""}`} key={section.key}>
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
            <button
              className="nav-toggle"
              onClick={() => {
                setOpenMenu(null);
                setMobileOpen(true);
              }}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <svg><use href="#i-menu"></use></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE DRAWER ═══ */}
      <div
        className={`mobile-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`mobile-menu${mobileOpen ? " open" : ""}`}
        id="mobileMenu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header row */}
        <div className="mobile-menu-head">
          <Link href="/" className="mobile-menu-brand" onClick={closeAll}>
            {logo ? (
              <Image src={logo} width={120} height={40} sizes="120px" alt={site?.name || BRAND_NAME} />
            ) : (
              <BrandMark size={34} />
            )}
            <div className="mobile-menu-brand-text">
              <span className="mobile-menu-brand-name">{site?.name || BRAND_NAME}</span>
              <span className="mobile-menu-brand-tag">Private | Luxury | Journeys</span>
            </div>
          </Link>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <svg><use href="#i-close"></use></svg>
          </button>
        </div>

        {/* Scrollable link list */}
        <div className="mobile-menu-body">
          {sections.map((section) => {
            const allLinks = [...section.columns.flat(), ...(section.secondary || [])];
            const isExpanded = openMobileSection === section.key;

            if (!hasPanel(section)) {
              return (
                <Link key={section.key} href={section.href} className="mm-plain-link" onClick={closeAll}>
                  {section.label}
                </Link>
              );
            }

            return (
              <div className="mm-section" key={section.key}>
                <button
                  className="mm-section-toggle"
                  aria-expanded={isExpanded}
                  onClick={() => setOpenMobileSection(isExpanded ? null : section.key)}
                >
                  {section.label}
                  <svg className="mm-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </button>
                <div className={`mm-links${isExpanded ? " is-open" : ""}`}>
                  {allLinks.map((link) => (
                    <Link key={link.href + link.label} href={link.href} onClick={closeAll}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: phone + CTA */}
        <div className="mobile-menu-foot">
          <div className="mobile-menu-phone">
            <svg><use href="#i-phone"></use></svg>
            <span>{phoneLabel} <strong>{phone}</strong></span>
          </div>
          <Link href="/#plan" className="btn btn-fill-ink" onClick={closeAll}>
            Plan Your Journey
          </Link>
        </div>
      </div>
    </>
  );
}
