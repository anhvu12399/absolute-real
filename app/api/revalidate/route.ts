import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = process.env.WORDPRESS_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  const supplied = request.headers.get("x-absolute-asia-signature") || "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const valid = supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const payload = JSON.parse(raw) as { path?: string };
  revalidateTag("wordpress", "max");
  revalidateTag("wordpress-rendered", "max");
  if (payload.path?.startsWith("/")) revalidatePath(payload.path);
  return NextResponse.json({ revalidated: true, path: payload.path || null });
}
