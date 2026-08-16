import { NextRequest, NextResponse } from "next/server";
import {
  publishUrlToGoogle,
  batchPublishUrlsToGoogle,
  getUrlIndexingMetadata,
  IndexNotificationType,
} from "@/lib/google-indexing";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.WORDPRESS_REVALIDATE_SECRET || process.env.INDEXING_SECRET;
  if (!secret) return true; // allow if no secret configured

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() === secret;
  }

  const queryKey = request.nextUrl.searchParams.get("key");
  if (queryKey === secret) return true;

  const headerKey = request.headers.get("x-indexing-key") || request.headers.get("x-revalidate-secret");
  if (headerKey === secret) return true;

  return false;
}

/**
 * GET /api/indexing?url=https://absoluteasiatours.com/vietnam/
 * Checks Google's latest indexing status for a URL.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing required 'url' parameter" }, { status: 400 });
  }

  const result = await getUrlIndexingMetadata(url);
  return NextResponse.json(result);
}

/**
 * POST /api/indexing
 * Body: { "urls": ["/vietnam/", "/japan/"], "type": "URL_UPDATED" }
 * or:   { "url": "/thailand/", "type": "URL_UPDATED" }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type: IndexNotificationType = body.type === "URL_DELETED" ? "URL_DELETED" : "URL_UPDATED";

  if (Array.isArray(body.urls) && body.urls.length > 0) {
    const urls = body.urls.slice(0, 100); // safety cap per request
    const results = await batchPublishUrlsToGoogle(urls, type, 100);
    const successCount = results.filter((r) => r.ok).length;

    return NextResponse.json({
      submitted: results.length,
      successCount,
      type,
      results,
    });
  }

  const singleUrl = body.url || body.path;
  if (!singleUrl || typeof singleUrl !== "string") {
    return NextResponse.json({ error: "Missing 'url' or 'urls' in request body" }, { status: 400 });
  }

  const result = await publishUrlToGoogle(singleUrl, type);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
