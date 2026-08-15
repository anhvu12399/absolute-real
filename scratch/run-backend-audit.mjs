import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://backend.absoluteasiatours.com";
const AUTH_HEADER = "Basic " + Buffer.from("absolute:93sy uV1C dpth J0s2 D1zx PN7d").toString("base64");
const OUTPUT_DIR = "/Users/mac/.gemini/antigravity-ide/scratch/absolute-asia-tours/outputs/migration-20260815-v8/post-audit";

mkdirSync(OUTPUT_DIR, { recursive: true });

const ROUTES = [
  "homepage",
  "posts",
  "trip",
  "places-to-go",
  "hotels",
  "travel-guides",
  "things-to-do",
  "blogs",
  "pages",
];

async function auditRoute(route) {
  console.log(`Đang chạy audit cho route: ${route}...`);
  const res = await fetch(`${BASE}/wp-json/absolute-asia/v1/import/audit`, {
    method: "POST",
    headers: {
      "Authorization": AUTH_HEADER,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ route, limit: 0 }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Audit route ${route} failed with status ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const filePath = join(OUTPUT_DIR, `${route}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2));

  const rows = data.rows || [];
  const missing = rows.filter((r) => r.status === "missing" || r.status === "unmapped" || r.status === "CHƯA MAP");
  const skip = rows.filter((r) => r.status === "skip" || r.status === "bỏ qua");
  const ok = rows.filter((r) => r.status === "ok");

  console.log(`  -> ${route}: Total=${rows.length}, OK=${ok.length}, Skip=${skip.length}, Missing=${missing.length}`);
  return { route, total: rows.length, ok: ok.length, skip: skip.length, missing: missing.length, missingRows: missing };
}

async function main() {
  const summary = [];
  for (const route of ROUTES) {
    const res = await auditRoute(route);
    summary.push(res);
  }

  const totalMissing = summary.reduce((sum, s) => sum + s.missing, 0);
  console.log("\n==========================================");
  console.log(`POST-AUDIT KẾT QUẢ TỔNG HỢP:`);
  console.log(`- Tổng số route: ${summary.length}`);
  console.log(`- Tổng số missing/unmapped rows: ${totalMissing}`);
  console.log("==========================================");

  writeFileSync(join(OUTPUT_DIR, "summary.json"), JSON.stringify({ totalMissing, summary }, null, 2));
}

main().catch(console.error);
