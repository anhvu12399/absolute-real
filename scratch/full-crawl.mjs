import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://absolute-real.vercel.app";
const SITEMAP_URL = `${BASE}/sitemap.xml`;
const OUTPUT_DIR = "/Users/mac/.gemini/antigravity-ide/scratch/absolute-asia-tours/outputs/crawl-v8";

mkdirSync(OUTPUT_DIR, { recursive: true });

async function getSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => {
    const rawUrl = m[1];
    const path = new URL(rawUrl).pathname;
    return `${BASE}${path}`;
  });
}

async function checkUrl(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "AAT-CrawlBot/1.0" } });
    const duration = Date.now() - t0;
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const is404 = res.status === 404 || (html.includes("404") && html.includes("This page could not be found"));

    return {
      url,
      status: res.status,
      durationMs: duration,
      title,
      is404,
      bytes: html.length,
      ok: res.ok && !is404,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      durationMs: Date.now() - t0,
      title: "",
      is404: true,
      bytes: 0,
      error: err.message,
      ok: false,
    };
  }
}

async function runPool(urls, concurrency = 15) {
  const results = [];
  let index = 0;
  console.log(`Bắt đầu crawl ${urls.length} URLs với concurrency=${concurrency}...`);

  async function worker(id) {
    while (index < urls.length) {
      const i = index++;
      const u = urls[i];
      const res = await checkUrl(u);
      results[i] = res;
      if (i % 25 === 0 || i === urls.length - 1) {
        console.log(`[${i + 1}/${urls.length}] ${res.status} ${u} (${res.durationMs}ms)`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i));
  await Promise.all(workers);
  return results;
}

async function main() {
  const urls = await getSitemapUrls();
  console.log(`Tìm thấy ${urls.length} URLs trong sitemap live.`);

  const results = await runPool(urls, 12);

  const errors = results.filter((r) => !r.ok);
  const avgDuration = Math.round(results.reduce((acc, r) => acc + r.durationMs, 0) / results.length);

  const summary = {
    totalUrls: urls.length,
    successfulUrls: results.filter((r) => r.ok).length,
    failedUrls: errors.length,
    averageDurationMs: avgDuration,
    scannedAt: new Date().toISOString(),
    errors,
  };

  const reportPath = join(OUTPUT_DIR, "full-crawl-report.json");
  writeFileSync(reportPath, JSON.stringify({ summary, results }, null, 2));

  console.log("\n==========================================");
  console.log(`🎉 CRAWL SITEMAP HOÀN TẤT:`);
  console.log(`- Tổng URL kiểm tra: ${summary.totalUrls}`);
  console.log(`- Thành công (200 OK): ${summary.successfulUrls}`);
  console.log(`- Lỗi (404/Error): ${summary.failedUrls}`);
  console.log(`- Thời gian phản hồi trung bình: ${summary.averageDurationMs}ms`);
  console.log(`- File báo cáo: ${reportPath}`);
  console.log("==========================================");
}

main().catch((err) => {
  console.error("Lỗi crawl:", err);
  process.exit(1);
});
