import type { MenuItem, SitePayload } from "@/lib/wp";
import { toLocalHref } from "@/lib/links";
import { BRAND_SHORT } from "@/lib/site";

/**
 * Navigation model shared by the header and the mobile menu.
 *
 * The WordPress primary menu is flat (each item carries a parent id), so it is
 * folded into sections here: top-level items become mega-menu columns, their
 * children fill the two link columns, and any third level becomes the
 * "signature" list on the right.
 */

export type NavLink = { label: string; href: string };

export type NavSection = {
  key: string;
  label: string;
  href: string;
  sectionTitle: string;
  columns: NavLink[][];
  ctaLabel?: string;
  secondaryTitle?: string;
  secondary?: NavLink[];
  featuredEyebrow?: string;
  featuredHref?: string;
  featuredTitle?: string;
};

const chunkIntoColumns = (links: NavLink[]): NavLink[][] => {
  if (!links.length) return [];
  const half = Math.ceil(links.length / 2);
  return [links.slice(0, half), links.slice(half)].filter((column) => column.length);
};

/**
 * Folds the flat WordPress menu into mega-menu sections.
 *
 * The menu is three levels deep: level 1 is the tab (DESTINATIONS), level 2 is
 * a column heading (SOUTHEAST ASIA & NORTH ASIA), and level 3 holds the actual
 * links. Treating level 2 as the links is what left the mega menu showing two
 * headings and no countries.
 */
export function sectionsFromMenu(menu?: MenuItem[]): NavSection[] {
  if (!menu?.length) return [];

  const byParent = new Map<number, MenuItem[]>();
  for (const item of [...menu].sort((a, b) => a.order - b.order)) {
    const siblings = byParent.get(item.parent) || [];
    siblings.push(item);
    byParent.set(item.parent, siblings);
  }

  const toLink = (item: MenuItem): NavLink => ({ label: item.title, href: toLocalHref(item.url) });

  /* Unfinished menu rows: an editor added four slots called "Image", "Image 2"
     … all pointing at the home page, meaning to drop press logos in later. They
     read as broken links in the footer, so they are dropped until they mean
     something. */
  const isPlaceholder = (link: NavLink) =>
    /^(image|logo|item|link)(\s*\d+)?$/i.test(link.label.trim()) && (link.href === "/" || link.href === "#");
  /* WordPress lets the same page sit under two headings; showing it twice in
     one panel just looks like a mistake. */
  const dedupe = (links: NavLink[]) =>
    [...new Map(links.map((l) => [`${l.label}|${l.href}`, l])).values()].filter((l) => !isPlaceholder(l));

  return (byParent.get(0) || []).map((top) => {
    const headings = byParent.get(top.id) || [];
    const groups = headings.map((heading) => ({
      heading,
      links: dedupe((byParent.get(heading.id) || []).map(toLink)),
    }));

    /* The panel has three slots, and the legacy menu was built for exactly
       that shape: a long list, a shorter list, and one highlighted item. */
    const lists = groups.filter((g) => g.links.length > 1);
    const solo = groups.find((g) => g.links.length === 1);

    const main = lists[0];
    const aside = lists[1];
    const featured = solo?.links[0];

    // No headings at all: the children are the links themselves.
    const flat = dedupe(headings.map(toLink));

    return {
      key: String(top.id),
      label: top.title,
      href: toLocalHref(top.url),
      sectionTitle: main?.heading.title || top.title,
      columns: main ? chunkIntoColumns(main.links) : chunkIntoColumns(flat),
      /* Only when the menu does not already carry one. The WordPress menu for
         Destinations ends with "ALL DESTINATIONS A-Z", so generating a second
         "View all destinations" beside it put the same link twice. */
      ctaLabel: hasCatchAll([...(main?.links || flat), ...(aside?.links || [])])
        ? undefined
        : `View all ${top.title.toLowerCase()}`,
      secondaryTitle: aside?.heading.title,
      secondary: aside?.links.slice(0, 8),
      featuredEyebrow: solo?.heading.title,
      featuredHref: featured?.href,
      featuredTitle: featured?.label,
    };
  });
}

/** True when a link already offers the whole section: "All X", "View all X", "X A-Z". */
function hasCatchAll(links: Array<{ label: string }>) {
  return links.some((link) => /^(view\s+)?all\b|\ba[-\s]?z$/i.test(link.label.trim()));
}

/** Shipped structure, used until the WordPress menu is populated. */
export const FALLBACK_SECTIONS: NavSection[] = [
  {
    key: "destinations",
    label: "DESTINATIONS",
    href: "/destinations/",
    sectionTitle: "SOUTHEAST ASIA & NORTH ASIA",
    columns: [
      [
        { label: "Thailand", href: "/thailand/" },
        { label: "Vietnam", href: "/vietnam/" },
        { label: "Japan", href: "/japan-tours/" },
        { label: "Malaysia", href: "/malaysia/" },
        { label: "Cambodia", href: "/cambodia/" },
        { label: "Indonesia", href: "/bali/" },
        { label: "Singapore", href: "/singapore/" },
        { label: "South Korea", href: "/south-korea/" },
      ],
      [
        { label: "Southeast Asia", href: "/destinations/" },
        { label: "Laos", href: "/laos/" },
        { label: "Taiwan", href: "/taiwan/" },
        { label: "Philippines", href: "/philippines/" },
        { label: "China", href: "/china/" },
        { label: "Bali", href: "/bali/" },
        { label: "Multi Country Tours", href: "/journeys/multi-country/" },
        { label: "North Korea", href: "/north-korea/" },
      ],
    ],
    ctaLabel: "ALL DESTINATIONS A-Z",
    secondaryTitle: "INDIA & THE HIMALAYA",
    secondary: [
      { label: "Bhutan Luxury Tours", href: "/bhutan/" },
      { label: "The Maldives", href: "/maldives/" },
      { label: "Sri Lanka Luxury Tours", href: "/sri-lanka/" },
      { label: "India Luxury Tours", href: "/india/" },
      { label: "Nepal Luxury Tours", href: "/nepal/" },
    ],
    featuredEyebrow: "EXPLORE BY REGION ›",
    featuredHref: "/inspirations/",
    featuredTitle: "The Ritz-Carlton, Bangkok is Ready for Its Grand Opening – Discover What Awaits",
  },
  {
    key: "journeys",
    label: "PRIVATE JOURNEYS",
    href: "/vietnam-tours/",
    sectionTitle: "TAILOR-MADE TRAVEL STYLES",
    columns: [
      [
        { label: "Private Tours", href: "/journeys/private-tours/" },
        { label: "Honeymoon & Romance", href: "/journeys/honeymoon/" },
        { label: "Family Vacations", href: "/journeys/family/" },
        { label: "Culture & Gastronomy", href: "/journeys/culture-food/" },
        { label: "Wellness & Spa", href: "/journeys/wellness/" },
      ],
      [
        { label: "Multi-Country Odysseys", href: "/journeys/multi-country/" },
        { label: "Wildlife & Nature", href: "/journeys/wildlife/" },
        { label: "Active & Adventure", href: "/journeys/active/" },
        { label: "Private Jet & Luxury Rail", href: "/journeys/rail-river/" },
        { label: "Grand Expeditions", href: "/journeys/bucket-list/" },
      ],
    ],
    ctaLabel: "VIEW ALL JOURNEYS A-Z",
    secondaryTitle: "SIGNATURE EXPERIENCES",
    secondary: [
      { label: "Private Halong Bay Junk Cruise", href: "/vietnam/where-to-stay/" },
      { label: "Angkor Wat Exclusive Sunrise", href: "/cambodia/" },
      { label: "Kyoto Private Tea Ceremony", href: "/japan-tours/" },
      { label: "Chiang Mai Sanctuary Experience", href: "/thailand/" },
      { label: "Saigon Vintage Vespa Tasting", href: "/journeys/culture-food/" },
    ],
    featuredEyebrow: "RECOMMENDED ODYSSEY ›",
    featuredHref: "/journeys/multi-country/",
    featuredTitle: "14-Day Grand Indochina Private Odyssey – Vietnam, Cambodia & Laos",
  },
  {
    key: "cruises",
    label: "CRUISES",
    href: "/cruises/",
    sectionTitle: "LUXURY WATERWAY EXPEDITIONS",
    columns: [
      [
        { label: "Halong Bay Luxury Junks", href: "/cruises/halong-bay/" },
        { label: "Lan Ha Bay Boutique Ships", href: "/cruises/lan-ha-bay/" },
        { label: "Bai Tu Long Untamed Waters", href: "/cruises/bai-tu-long/" },
        { label: "Mekong River Expeditions", href: "/cruises/mekong-river/" },
        { label: "Irrawaddy & Chindwin River", href: "/cruises/myanmar/" },
      ],
      [
        { label: "Private Charter Vessels", href: "/cruises/private-charter/" },
        { label: "Private Day Cruises", href: "/cruises/day-cruises/" },
        { label: "Luxury Dining Cruises", href: "/cruises/dining/" },
        { label: "Multi-Day Water Itineraries", href: "/cruises/multi-day/" },
        { label: "Ship & Route Comparisons", href: "/cruises/comparisons/" },
      ],
    ],
    ctaLabel: "VIEW ALL CRUISE FLEETS A-Z",
    secondaryTitle: "TOP FLEETS",
    secondary: [
      { label: "Heritage Line Violet & Jasmine", href: "/cruises/halong-bay/" },
      { label: "Aqua Mekong Luxury Ship", href: "/cruises/mekong-river/" },
      { label: "Capella Cruise Halong", href: "/cruises/halong-bay/" },
      { label: "Indochine Premium Cruise", href: "/cruises/halong-bay/" },
      { label: "The Jahan Mekong Cruise", href: "/cruises/mekong-river/" },
    ],
    featuredEyebrow: "CRUISE SPOTLIGHT ›",
    featuredHref: "/cruises/halong-bay/",
    featuredTitle: "Overnight Aboard Halong Bay's Most Exclusive 5-Star Boutique Vessel",
  },
  {
    key: "inspiration",
    label: "TRAVEL INSPIRATION",
    href: "/inspirations/",
    sectionTitle: "ESSENTIAL GUIDES & INSIGHTS",
    columns: [
      [
        { label: "Destination Guides", href: "/inspiration/destination-guides/" },
        { label: "Itinerary Ideas", href: "/travel-ideas/" },
        { label: "Where to Stay (Hotels)", href: "/where-to-stay/" },
        { label: "Cruise Guides", href: "/inspiration/cruise-guides/" },
        { label: "Planning & Weather Advice", href: "/inspiration/planning-advice/" },
      ],
      [
        { label: "Luxury Packing Checklists", href: "/inspiration/packing/" },
        { label: "Michelin & Street Food Guides", href: "/inspiration/culinary/" },
        { label: "Cultural Etiquette", href: "/inspiration/etiquette/" },
        { label: "Destination Comparisons", href: "/inspiration/comparisons/" },
        { label: "Photography Spotlights", href: "/inspiration/photography/" },
      ],
    ],
    ctaLabel: "EXPLORE ALL ARTICLES A-Z",
    secondaryTitle: "CURATED STORIES",
    secondary: [
      { label: "10 Best Luxury Resorts in Vietnam", href: "/where-to-stay/" },
      { label: "Secret Temples Beyond Angkor Wat", href: "/cambodia/" },
      { label: "Michelin Dining Guide to Bangkok", href: "/thailand/" },
      { label: "Cherry Blossom Season Guide", href: "/japan-tours/" },
      { label: "Best Time to Visit Southeast Asia", href: "/inspiration/planning-advice/" },
    ],
    featuredEyebrow: "EDITOR'S CHOICE ›",
    featuredHref: "/where-to-stay/",
    featuredTitle: "Where to Stay in Asia: The 2026 Gold List of Ultra-Luxury Resorts",
  },
  {
    key: "whyus",
    label: "WHY ABSOLUTE ASIA",
    href: "/about-us/",
    sectionTitle: "OUR PHILOSOPHY & PROMISE",
    columns: [
      [
        { label: "Our Asia Specialists", href: "/why-us/our-specialists/" },
        { label: "Traveler Reviews", href: "/why-us/reviews/" },
        { label: "Responsible Travel", href: "/why-us/responsible-travel/" },
        { label: "Booking Confidence", href: "/why-us/booking-confidence/" },
        { label: `About ${BRAND_SHORT}`, href: "/about-us/" },
      ],
      [
        { label: "Private Chauffeur Service", href: "/why-us/chauffeurs/" },
        { label: "24/7 On-Ground Support", href: "/why-us/concierge/" },
        { label: "Community Impact", href: "/why-us/sustainability/" },
        { label: "Awards & Recognition", href: "/why-us/awards/" },
        { label: "Contact Our Designers", href: "/plan-my-trip/" },
      ],
    ],
    ctaLabel: "PLAN YOUR JOURNEY WITH A SPECIALIST",
    secondaryTitle: "THE ABSOLUTE DIFFERENCE",
    secondary: [
      { label: "100% Tailor-Made Itineraries", href: "/why-us/our-specialists/" },
      { label: "Handpicked 5-Star Boutique Hotels", href: "/where-to-stay/" },
      { label: "Private Local Guides & Drivers", href: "/why-us/our-specialists/" },
      { label: "Zero Hidden Fees Guarantee", href: "/why-us/booking-confidence/" },
      { label: "Rated 4.9/5 on Tripadvisor", href: "/why-us/reviews/" },
    ],
    featuredEyebrow: "GUEST STORIES ›",
    featuredHref: "/why-us/reviews/",
    featuredTitle: `“${BRAND_SHORT} crafted the trip of a lifetime for our family across 3 countries.” – Peter & Sarah, NY`,
  },
];

export function resolveSections(site?: SitePayload | null): NavSection[] {
  const fromWp = sectionsFromMenu(site?.menu);
  return fromWp.length ? fromWp : FALLBACK_SECTIONS;
}
