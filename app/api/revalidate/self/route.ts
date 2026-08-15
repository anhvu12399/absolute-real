import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Republish one page, pressed from the edit bar on that page.
 *
 * The sibling route at /api/revalidate is for WordPress: it signs its own
 * payload on save. A browser cannot do that, and it cannot prove it is signed
 * into WordPress either — the WP auth cookie belongs to the backend host, not
 * to this one. So the editor carries a short-lived token minted by
 * /absolute-asia/v1/me, which only issues it to a user who can edit posts.
 * Both sides hold the same secret, so this route can check it without asking
 * WordPress anything.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WORDPRESS_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  let payload: { path?: string; token?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  if (!verifyToken(payload.token, secret)) {
    return NextResponse.json({ error: "Not signed in as an editor" }, { status: 401 });
  }

  /* Only a path on this site, so the button cannot be pointed elsewhere. */
  const path = typeof payload.path === "string" ? payload.path : "";
  if (!path.startsWith("/") || path.startsWith("//")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  revalidateTag("wordpress", "max");
  revalidateTag("wordpress-rendered", "max");
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path });
}

/** `<unix expiry>.<hmac>` — see aat_issue_edit_token() in the plugin. */
function verifyToken(token: string | undefined, secret: string) {
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return false;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false;

  const expected = createHmac("sha256", secret).update(`aat-edit:${expiry}`).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
