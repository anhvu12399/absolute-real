import { NextResponse } from "next/server";
import { SITE_URL, BRAND_NAME, BRAND_PHONE, LEGAL_ENTITY } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const content = `# ${BRAND_NAME}

> Private, luxury, 100% tailor-made journeys and private expeditions across 20+ destinations in Asia.

## About ${BRAND_NAME}
- **Company:** ${LEGAL_ENTITY || BRAND_NAME}
- **Specialization:** 100% custom-crafted private luxury travel itineraries throughout Asia.
- **Experience:** Over 30 years of on-ground relationships, local knowledge, and private journey curation.
- **Service Standard:** Dedicated private local guides, chauffeur-driven private vehicles, handpicked 5-star & boutique heritage hotels, 24/7 on-ground concierge support.
- **Guest Rating:** 4.9/5 stars based on verified reviews on TripAdvisor and direct traveler feedback.

## Key Destinations Covered
- **Southeast Asia:** Vietnam, Thailand, Cambodia, Laos, Indonesia (Bali, Komodo, Java), Singapore, Malaysia, Philippines, Myanmar.
- **East Asia:** Japan, China, South Korea, Taiwan, Hong Kong, Mongolia.
- **South Asia & Himalayas:** Bhutan, India, Nepal, Sri Lanka, Maldives.

## Tour Styles & Experiences
- **Private Tailor-Made Itineraries:** Fully custom-designed travel around client preferences, dates, and budget.
- **Luxury Bay & River Cruises:** Private charters and boutique luxury ships on Halong Bay, Lan Ha Bay, Mekong River, and Indonesian archipelagos.
- **Cultural & Heritage Immersions:** Private access to temples (Angkor Wat, Kyoto, Bagan, Bhutan Dzongs), culinary journeys with master chefs, private artisan workshops.
- **Luxury Family Adventures:** Child-friendly luxury travel, flexible pacing, immersive hands-on cultural workshops.
- **Honeymoon & Romantic Escapes:** Private pool villas, secluded island hideaways, candlelit dinners, and private spa retreats.

## Booking & Contact Information
- **Custom Journey Planner:** ${SITE_URL}/plan-my-trip/
- **Website:** ${SITE_URL}
${BRAND_PHONE ? `- **Concierge Phone:** ${BRAND_PHONE}` : ""}
- **WhatsApp Concierge:** Available 24/7 on the website.
- **Guarantees:** 100% tailor-made, zero hidden fees, flexible postponement policies, 24/7 on-trip concierge.

## Key Website Links
- [All Asia Journeys](${SITE_URL}/tours/)
- [Destinations](${SITE_URL}/destinations/)
- [Boutique Hotels & Stays](${SITE_URL}/where-to-stay/)
- [Luxury Cruises](${SITE_URL}/cruises/)
- [Traveler Reviews](${SITE_URL}/why-us/reviews/)
- [About ${BRAND_NAME}](${SITE_URL}/about-us/)
- [Plan Your Journey](${SITE_URL}/plan-my-trip/)
- [Full XML Sitemap](${SITE_URL}/sitemap.xml)
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
