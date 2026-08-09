import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { z } from "zod";

const Lead = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().trim().max(50).optional().default(""),
  destination: z.string().trim().max(150).optional().default(""),
  message: z.string().trim().min(10).max(5000),
  sourcePath: z.string().startsWith("/").max(500),
  company: z.string().max(0).optional().default(""),
});

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Lead storage is not configured" }, { status: 503 });
  const parsed = Lead.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the form fields" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(`${ip}:${process.env.WORDPRESS_REVALIDATE_SECRET || "local"}`).digest("hex");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
  try {
    const recent = await sql`select count(*)::int as count from leads where ip_hash=${ipHash} and created_at > now() - interval '15 minutes'`;
    if (recent[0].count >= 5) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const id = randomUUID();
    const utm = Object.fromEntries(["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].map((key) => [key, new URL(request.url).searchParams.get(key)]).filter(([,value]) => value));
    await sql`insert into leads (id,name,email,phone,destination,message,source_path,utm,ip_hash,email_status) values (${id},${parsed.data.name},${parsed.data.email},${parsed.data.phone},${parsed.data.destination},${parsed.data.message},${parsed.data.sourcePath},${sql.json(utm)},${ipHash},'pending')`;
    let emailStatus = "not_configured";
    if (process.env.RESEND_API_KEY && process.env.LEAD_FROM_EMAIL && process.env.LEAD_TO_EMAIL) {
      const email = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.LEAD_FROM_EMAIL, to: [process.env.LEAD_TO_EMAIL], reply_to: parsed.data.email, subject: `New website enquiry: ${parsed.data.destination || "Asia journey"}`, text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nPhone: ${parsed.data.phone}\nDestination: ${parsed.data.destination}\nPage: ${parsed.data.sourcePath}\n\n${parsed.data.message}` }) });
      emailStatus = email.ok ? "sent" : "failed";
    }
    await sql`update leads set email_status=${emailStatus}, email_attempted_at=now() where id=${id}`;
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Lead submission failed", error);
    return NextResponse.json({ error: "Unable to save enquiry" }, { status: 500 });
  } finally { await sql.end(); }
}
