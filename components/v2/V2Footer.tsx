import Link from "next/link";
import Image from "next/image";
import type { MenuItem, SitePayload } from "@/lib/wp";
import { toLocalHref } from "@/lib/links";
import { BRAND_NAME, BRAND_SHORT, SOCIAL_LINKS } from "@/lib/site";

/**
 * Footer columns come from the WordPress "footer" menu; these ship until it
 * exists. Every href below was checked against the live site — the previous
 * list sent both "Our Foundation" and "Contact Us" to `/#plan`, which is a
 * call-to-action band on the homepage: neither a foundation page nor a way to
 * contact anyone.
 *
 * Countries are grouped the way the office sells them, not alphabetically:
 * a traveller looking for Bhutan is thinking about the Himalaya, not about B.
 */
const FALLBACK_COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Why Choose Absolute Asia",
    links: [
      { label: "About Us", href: "/about-us/" },
      { label: "Meet the Team", href: "/meet-the-team/" },
      { label: "Why Travel With Us", href: "/why-us/" },
      { label: "Tailor-Made Tours", href: "/tailor-made-tours/" },
      { label: "Travel Journal", href: "/blogs/" },
      { label: "Contact Us", href: "/plan-my-trip/" },
    ],
  },
  {
    title: "Popular Travel Destinations",
    links: [
      { label: "Vietnam", href: "/vietnam/" },
      { label: "Thailand", href: "/thailand/" },
      { label: "Cambodia", href: "/cambodia/" },
      { label: "Laos", href: "/laos/" },
      { label: "Myanmar", href: "/myanmar/" },
      { label: "Bali", href: "/bali/" },
      { label: "Singapore", href: "/singapore/" },
      { label: "Malaysia", href: "/malaysia/" },
      { label: "The Philippines", href: "/philippines/" },
    ],
  },
  {
    title: "India & The Himalayas",
    links: [
      { label: "India", href: "/india/" },
      { label: "Nepal", href: "/nepal/" },
      { label: "Bhutan", href: "/bhutan/" },
      { label: "Sri Lanka", href: "/sri-lanka/" },
      { label: "The Maldives", href: "/maldives/" },
    ],
  },
  {
    title: "North Asia",
    links: [
      { label: "China", href: "/china/" },
      { label: "Japan", href: "/japan/" },
      { label: "South Korea", href: "/south-korea/" },
      { label: "North Korea", href: "/north-korea/" },
      { label: "Taiwan", href: "/taiwan/" },
      { label: "Hong Kong", href: "/hong-kong-tours/" },
    ],
  },
  {
    title: "Our Popular Journeys",
    links: [
      { label: "Vietnam Tours", href: "/vietnam-tours/" },
      { label: "Thailand Tours", href: "/thailand-tours/" },
      { label: "Japan Tours", href: "/japan-tours/" },
      { label: "China Tours", href: "/china-tours/" },
      { label: "Halong Bay Cruises", href: "/halong-bay-cruises/" },
      { label: "Mekong River Cruises", href: "/mekong-river-cruises/" },
      { label: "Where to Stay", href: "/where-to-stay/" },
    ],
  },
];

/** The small print, and the pages a visitor goes looking for by name. */
const LEGAL_LINKS = [
  { label: "Terms & Conditions", href: "/terms-and-conditions/" },
  { label: "Privacy Policy", href: "/privacy-policy/" },
  { label: "About Us", href: "/about-us/" },
  { label: "Meet the Team", href: "/meet-the-team/" },
  { label: "My Wishlist", href: "/my-wishlist/" },
];

/* Who the company legally is. Required on the page, and it is also the answer
   to the question a first-time visitor is quietly asking. */
const LEGAL_ENTITY =
  "Absolute Asia Tours is a division of My Way Luxury Travel LLC, a registered " +
  "Limited Liability Company in the State of New York, USA (DOS ID: 7926729).";

function columnsFromMenu(menu?: MenuItem[]) {
  if (!menu?.length) return FALLBACK_COLUMNS;
  const sorted = [...menu].sort((a, b) => a.order - b.order);
  const tops = sorted.filter((item) => item.parent === 0);
  const columns = tops.map((top) => ({
    title: top.title,
    links: sorted
      .filter((item) => item.parent === top.id)
      .map((item) => ({ label: item.title, href: toLocalHref(item.url) }))
      /* Unfinished menu rows ("Image 2" → "/") read as broken links. */
      .filter((link) => !/^(image|logo|item|link)(\s*\d+)?$/i.test(link.label.trim()) || (link.href !== "/" && link.href !== "#")),
  })).filter((column) => column.links.length > 0);
  return columns.some((column) => column.links.length) ? columns : FALLBACK_COLUMNS;
}

export function V2Footer({ site }: { site?: SitePayload | null }) {
  const columns = columnsFromMenu(site?.footerMenu);
  const name = site?.name || BRAND_SHORT;

  return (
    <footer>
      <div className="container footer-top">
        <div className="footer-brand">
          <Link href="/" className="brand-mark footer-brand-mark" style={{ marginBottom: "1.2rem", display: "inline-flex", textDecoration: "none" }}>
            {site?.logo ? (
              <Image className="brand-logo" src={site.logo} width={240} height={80} sizes="132px" alt={site?.name || BRAND_NAME} />
            ) : (
              <span className="seal">A</span>
            )}
            <span className="brand-text">
              <span className="name">{site?.name || BRAND_NAME}</span>
              <span className="tag">Private | Luxury | Journeys</span>
            </span>
          </Link>
          <h4 className="footer-brand-title">Stay in Touch</h4>
          <h3>Find your next <em>journey</em></h3>
          <p>{name}&apos;s dispatch is filled with real itineraries and the odd travel tip, sent a few times a year.</p>
          <div className="footer-newsletter">
            <input type="email" placeholder="Your email address" aria-label="Email for newsletter" />
            <button>Sign Up</button>
          </div>
          {/* Configured per site; no row at all beats linking to the wrong
              company's profiles. See NEXT_PUBLIC_SOCIALS. */}
          {SOCIAL_LINKS.length > 0 && (
            <div className="footer-socials">
              {SOCIAL_LINKS.map((social) => (
                <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer">{social.label}</a>
              ))}
            </div>
          )}
          {site?.phone && (
            <p style={{ marginTop: "1rem" }}>
              {site.phoneLabel || "Call us"} <strong>{site.phone}</strong>
            </p>
          )}
        </div>

        {columns.map((column) => (
          <div className="footer-col" key={column.title}>
            <h4>{column.title}</h4>
            <ul>
              {column.links.map((link) => (
                <li key={link.href + link.label}><Link href={link.href}>{link.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container footer-bottom">
        <nav className="footer-legal-links" aria-label="Legal and account">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <p className="footer-entity">{LEGAL_ENTITY}</p>
        <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
      </div>
    </footer>
  );
}
