import { NextResponse } from "next/server";
import { SITE_URL, BRAND_NAME, BRAND_PHONE, LEGAL_ENTITY } from "@/lib/site";
import { getArchiveSafe } from "@/lib/wp";

export const revalidate = 7200;

export async function GET() {
  const [tours, places] = await Promise.all([
    getArchiveSafe({ type: "tour", perPage: 50 }),
    getArchiveSafe({ type: "place_to_go", perPage: 50 }),
  ]);

  let text = `# ${BRAND_NAME} — Full Knowledge Index for LLMs

> Complete index of private luxury tours, destinations, boutique accommodations, and bespoke travel services in Asia.

## Primary Core Services
1. **100% Tailor-Made Private Journeys:** Every itinerary is custom-crafted to traveler dates, pace, and interests.
2. **Private Chauffeur & Guides:** Private modern air-conditioned vehicles and certified local specialist guides.
3. **5-Star Boutique Accommodations:** Stays at Aman, Four Seasons, Rosewood, Capella, Belmond, and handpicked heritage luxury estates.
4. **24/7 Concierge Support:** Continuous on-the-ground support throughout the entire trip.

---

## Featured Private Itineraries
`;

  for (const tour of tours) {
    text += `### ${tour.title}\n`;
    if (tour.duration) text += `- **Duration:** ${tour.duration}\n`;
    if (tour.price) text += `- **Starting Price:** ${tour.price}\n`;
    text += `- **URL:** ${SITE_URL}${tour.path}\n`;
    if (tour.excerpt) text += `- **Overview:** ${tour.excerpt}\n`;
    text += `\n`;
  }

  text += `---

## Key Destinations & Highlights
`;

  for (const place of places) {
    text += `### ${place.title}\n`;
    text += `- **URL:** ${SITE_URL}${place.path}\n`;
    if (place.excerpt) text += `- **Description:** ${place.excerpt}\n`;
    text += `\n`;
  }

  text += `---

## Contact & Enquiries
- **Custom Journey Request:** ${SITE_URL}/plan-my-trip/
- **Email:** mywaytravelinc@gmail.com
${BRAND_PHONE ? `- **Phone:** ${BRAND_PHONE}` : ""}
- **XML Sitemap:** ${SITE_URL}/sitemap.xml
`;

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
