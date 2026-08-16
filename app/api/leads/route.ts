import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { z } from "zod";

/**
 * Enquiries from the tailor-made form.
 *
 * Full customer information is formatted and delivered to mywaytravelinc@gmail.com
 * through a multi-tier resilient architecture:
 * 1. Direct Resend delivery (if RESEND_API_KEY is configured).
 * 2. WordPress bridge delivery via wp_mail + persistent lead storage.
 * 3. Postgres database recording (if DATABASE_URL is configured).
 */
const Lead = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().trim().max(50).optional().default(""),
  destination: z.string().trim().max(300).optional().default(""),
  message: z.string().trim().max(5000).optional().default(""),
  sourcePath: z.string().max(500).optional().default("/"),
  /* Labelled fields from the form: Start date, Budget, Travelers, Advisor, etc. */
  details: z.record(z.string(), z.string()).optional().default({}),
  /* Honeypot: real users never fill hidden fields */
  company: z.string().max(0).optional().default(""),
});

const TO_EMAIL = process.env.LEAD_TO_EMAIL || "mywaytravelinc@gmail.com";
const WP_API_URL = process.env.WORDPRESS_API_URL || "https://backend.absoluteasiatours.com/wp-json";

export async function POST(request: NextRequest) {
  const rawJson = await request.json().catch(() => null);
  const parsed = Lead.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please verify all required form fields", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const lead = parsed.data;

  // Honeypot catch: return 200 silently to bots
  if (lead.company) {
    return NextResponse.json({ ok: true, id: "hp_ok" }, { status: 200 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256")
    .update(`${ip}:${process.env.WORDPRESS_REVALIDATE_SECRET || "local"}`)
    .digest("hex");

  const id = randomUUID();
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
      .map((key) => [key, new URL(request.url).searchParams.get(key)])
      .filter(([, value]) => value)
  );

  /* Storage first when Postgres exists */
  const sql = process.env.DATABASE_URL
    ? postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 })
    : null;

  try {
    if (sql) {
      const recent = await sql`
        select count(*)::int as count from leads
         where ip_hash=${ipHash} and created_at > now() - interval '15 minutes'`;
      if (recent[0]?.count >= 10) {
        return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
      }
      await sql`
        insert into leads (id,name,email,phone,destination,message,source_path,utm,ip_hash,email_status)
        values (${id},${lead.name},${lead.email},${lead.phone},${lead.destination},
                ${composePlainText(lead)},${lead.sourcePath},${sql.json(utm)},${ipHash},'pending')`;
    }

    // 1. Send via Resend if configured
    let resendStatus = await sendResendEmail(lead);

    // 2. Forward to WordPress bridge (wp_mail + backend storage)
    let wpStatus = await sendWpEmailBridge(lead);

    const emailDelivered = resendStatus === "sent" || wpStatus === "sent";

    if (sql) {
      const finalStatus = emailDelivered ? "sent" : "failed";
      await sql`update leads set email_status=${finalStatus}, email_attempted_at=now() where id=${id}`;
    }

    return NextResponse.json(
      {
        ok: true,
        id,
        delivered: emailDelivered,
        recipient: TO_EMAIL,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lead submission processing error:", error);
    return NextResponse.json({ error: "Unable to process enquiry" }, { status: 500 });
  } finally {
    await sql?.end();
  }
}

/** Plain text representation of all form details */
function composePlainText(lead: z.infer<typeof Lead>) {
  const lines = [
    `CUSTOMER ENQUIRY — ABSOLUTE ASIA TOURS`,
    `========================================`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.destination ? `Destinations: ${lead.destination}` : null,
    `Source Page: ${lead.sourcePath}`,
    "",
    "--- ADDITIONAL DETAILS ---",
    ...Object.entries(lead.details)
      .filter(([, val]) => val && val.trim())
      .map(([label, val]) => `${label}: ${val}`),
    "",
    "--- CLIENT NOTES & IDEAL JOURNEY ---",
    lead.message || "(No additional notes provided)",
    `========================================`,
    `Delivered to: ${TO_EMAIL} at ${new Date().toISOString()}`,
  ];
  return lines.filter((line) => line !== null).join("\n");
}

/** Luxury Branded HTML Email Template */
function composeHtmlEmail(lead: z.infer<typeof Lead>) {
  const detailRows = Object.entries(lead.details)
    .filter(([, val]) => val && val.trim())
    .map(
      ([label, val]) =>
        `<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;width:180px;">${escapeHtml(
          label
        )}</td><td style="padding:10px 14px;border:1px solid #e8e2d8;color:#222;">${escapeHtml(
          val
        )}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background-color:#f6f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e2a27;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5dfd5;box-shadow:0 6px 20px rgba(0,0,0,0.06);">
    <div style="background:#1b2b27;padding:28px 24px;text-align:center;border-bottom:3px solid #c5a880;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:1.5px;font-weight:400;font-family:Georgia,serif;">ABSOLUTE ASIA TOURS</h1>
      <p style="color:#c5a880;margin:6px 0 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Private Luxury Journey Enquiry</p>
    </div>
    
    <div style="padding:28px 24px;">
      <h2 style="font-size:17px;margin-top:0;color:#1b2b27;border-bottom:1px solid #ede8e1;padding-bottom:8px;font-family:Georgia,serif;">Traveller Details</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
        <tr>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;width:180px;">Full Name</td>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:bold;color:#1b2b27;font-size:15px;">${escapeHtml(lead.name)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Email Address</td>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;"><a href="mailto:${escapeHtml(lead.email)}" style="color:#a85a3c;text-decoration:none;font-weight:600;">${escapeHtml(lead.email)}</a></td>
        </tr>
        ${lead.phone ? `<tr>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Phone Number</td>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;"><a href="tel:${escapeHtml(lead.phone.replace(/[^\d+]/g, ""))}" style="color:#1b2b27;text-decoration:none;font-weight:600;">${escapeHtml(lead.phone)}</a></td>
        </tr>` : ""}
        ${lead.destination ? `<tr>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Destinations</td>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;color:#1b2b27;">${escapeHtml(lead.destination)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Source Page</td>
          <td style="padding:10px 14px;border:1px solid #e8e2d8;color:#555;">${escapeHtml(lead.sourcePath || "/")}</td>
        </tr>
        ${detailRows}
      </table>

      ${lead.message ? `
      <h2 style="font-size:17px;color:#1b2b27;margin-top:24px;border-bottom:1px solid #ede8e1;padding-bottom:8px;font-family:Georgia,serif;">Client Notes & Ideal Journey</h2>
      <div style="background:#fcfbf9;border:1px solid #e8e2d8;padding:16px;border-radius:4px;font-size:14px;line-height:1.65;color:#333;white-space:pre-wrap;">${escapeHtml(lead.message)}</div>
      ` : ""}

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center;">
        Sent to <strong>${escapeHtml(TO_EMAIL)}</strong> &bull; Generated from Absolute Asia Tours Web Application.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m] || m);
}

async function sendResendEmail(lead: z.infer<typeof Lead>) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_FROM_EMAIL || "Absolute Asia Tours <inquiry@absoluteasiatours.com>";
  if (!key) return "not_configured";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [TO_EMAIL],
        reply_to: lead.email,
        subject: `[New Enquiry] ${lead.destination || "Asia Journey"} — ${lead.name}`,
        text: composePlainText(lead),
        html: composeHtmlEmail(lead),
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch (err) {
    console.error("Resend delivery failed:", err);
    return "failed";
  }
}

async function sendWpEmailBridge(lead: z.infer<typeof Lead>) {
  try {
    const endpoint = `${WP_API_URL.replace(/\/+$/, "")}/absolute-asia/v1/lead`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      return data?.email_sent || data?.ok ? "sent" : "recorded";
    }
    return "failed";
  } catch (err) {
    console.error("WordPress lead bridge error:", err);
    return "failed";
  }
}
