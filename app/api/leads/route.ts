import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { z } from "zod";

/**
 * Enquiries from the tailor-made form.
 *
 * Two things happen with a submission, and they are deliberately independent:
 * it is emailed to the office, and — if a database is configured — recorded.
 * The route used to refuse outright without DATABASE_URL, which meant every
 * enquiry was lost on a deployment that had email set up but no Postgres. The
 * email is the part the business actually needs; storage is bookkeeping.
 */
const Lead = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().trim().max(50).optional().default(""),
  destination: z.string().trim().max(300).optional().default(""),
  message: z.string().trim().max(5000).optional().default(""),
  sourcePath: z.string().startsWith("/").max(500),
  /* Everything the tailor-made form asks that does not fit the columns above.
     Kept as labelled lines so the email reads like the form looked. */
  details: z.record(z.string(), z.string()).optional().default({}),
  /* Honeypot: a real person never fills a field they cannot see. */
  company: z.string().max(0).optional().default(""),
});

const TO = process.env.LEAD_TO_EMAIL || "mywaytravelinc@gmail.com";

export async function POST(request: NextRequest) {
  const parsed = Lead.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form fields" }, { status: 400 });
  }
  const lead = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256")
    .update(`${ip}:${process.env.WORDPRESS_REVALIDATE_SECRET || "local"}`)
    .digest("hex");

  const id = randomUUID();
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
      .map((key) => [key, new URL(request.url).searchParams.get(key)])
      .filter(([, value]) => value),
  );

  /* Storage first when it exists, because it also carries the rate limit. */
  const sql = process.env.DATABASE_URL
    ? postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 })
    : null;

  try {
    if (sql) {
      const recent = await sql`
        select count(*)::int as count from leads
         where ip_hash=${ipHash} and created_at > now() - interval '15 minutes'`;
      if (recent[0].count >= 5) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
      await sql`
        insert into leads (id,name,email,phone,destination,message,source_path,utm,ip_hash,email_status)
        values (${id},${lead.name},${lead.email},${lead.phone},${lead.destination},
                ${composeMessage(lead)},${lead.sourcePath},${sql.json(utm)},${ipHash},'pending')`;
    }

    const emailStatus = await sendEmail(lead);
    if (sql) {
      await sql`update leads set email_status=${emailStatus}, email_attempted_at=now() where id=${id}`;
    }

    /* An enquiry that reached neither the inbox nor a table is lost, and the
       visitor should not be told it arrived. */
    if (emailStatus !== "sent" && !sql) {
      console.error("Enquiry could not be delivered: no email provider and no database configured");
      return NextResponse.json({ error: "Unable to send enquiry" }, { status: 503 });
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Lead submission failed", error);
    return NextResponse.json({ error: "Unable to save enquiry" }, { status: 500 });
  } finally {
    await sql?.end();
  }
}

/** The form's own fields, in the order they were asked. */
function composeMessage(lead: z.infer<typeof Lead>) {
  const lines = Object.entries(lead.details)
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `${label}: ${value}`);
  return [lead.message, lines.join("\n")].filter(Boolean).join("\n\n").trim();
}

async function sendEmail(lead: z.infer<typeof Lead>) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_FROM_EMAIL;
  if (!key || !from) return "not_configured";

  const body = [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.destination && `Destinations: ${lead.destination}`,
    `Page: ${lead.sourcePath}`,
    "",
    composeMessage(lead),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [TO],
        reply_to: lead.email,
        subject: `New enquiry: ${lead.destination || "Asia journey"} — ${lead.name}`,
        text: body,
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
