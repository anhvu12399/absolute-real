import Link from "next/link";
import type { MenuItem, SitePayload } from "@/lib/wp";
import { toLocalHref } from "@/lib/links";
import { BRAND_SHORT, SOCIAL_LINKS } from "@/lib/site";

/** Footer columns come from the WordPress "footer" menu; these ship until it exists. */
const FALLBACK_COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about-us/" },
      { label: "Our Foundation", href: "/#plan" },
      { label: "Blog", href: "/blogs/" },
      { label: "Contact Us", href: "/#plan" },
    ],
  },
  {
    title: "Destinations",
    links: [
      { label: "Vietnam", href: "/vietnam/" },
      { label: "Cambodia", href: "/cambodia/" },
      { label: "Laos", href: "/laos/" },
      { label: "Thailand", href: "/thailand/" },
      { label: "Bhutan", href: "/bhutan/" },
      { label: "Bali", href: "/bali/" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Booking Terms", href: "/terms-and-conditions/" },
      { label: "Privacy Policy", href: "/privacy-policy/" },
      { label: "Travel Protection", href: "/travel-protection/" },
    ],
  },
];

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
          <span className="footer-mark">AA</span>
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
        <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
        <span>New York, NY · By appointment</span>
      </div>
    </footer>
  );
}
