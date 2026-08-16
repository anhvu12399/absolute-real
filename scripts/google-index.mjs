#!/usr/bin/env node

/**
 * Google Indexing API Batch Submitter
 *
 * Usage:
 *   node scripts/google-index.mjs [url1] [url2] ...
 *   node scripts/google-index.mjs --all
 *   node scripts/google-index.mjs --status https://absoluteasiatours.com/vietnam/
 */

import { createSign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env / .env.local if present
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = resolve(ROOT, file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const GOOGLE_INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const GOOGLE_METADATA_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications/metadata";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.absoluteasiatours.com").replace(/\/+$/, "");

function getCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (parsed.client_email && parsed.private_key) {
        return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
      }
    } catch {}
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
  }

  return null;
}

function createSignedJwt(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: INDEXING_SCOPE,
    aud: GOOGLE_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const encodedHeader = base64Url(header);
  const encodedClaimSet = base64Url(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();

  const signature = signer.sign(privateKey, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${signatureInput}.${signature}`;
}

async function getAccessToken(creds) {
  const jwt = createSignedJwt(creds.clientEmail, creds.privateKey);
  const res = await fetch(GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function publishUrl(token, url, type = "URL_UPDATED") {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  const res = await fetch(GOOGLE_INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: fullUrl, type }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, url: fullUrl, status: res.status, error: data?.error?.message || `HTTP ${res.status}` };
  }
  return { ok: true, url: fullUrl, notifyTime: data?.urlNotificationMetadata?.latestUpdate?.notifyTime };
}

async function getMetadata(token, url) {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  const res = await fetch(`${GOOGLE_METADATA_ENDPOINT}?url=${encodeURIComponent(fullUrl)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function fetchSitemapUrls() {
  const target = `${SITE_URL}/sitemap.xml`;
  console.log(`📡 Fetching live sitemap: ${target}`);
  const res = await fetch(target);
  if (!res.ok) throw new Error(`Failed to fetch sitemap: HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [];
  const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

async function main() {
  const args = process.argv.slice(2);
  const creds = getCredentials();

  if (!creds) {
    console.error(`\n❌ Error: Google Service Account credentials not found in environment.`);
    console.error(`Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`);
    console.error(`or GOOGLE_SERVICE_ACCOUNT_JSON in .env.local or Vercel Environment Variables.\n`);
    process.exit(1);
  }

  console.log(`🔑 Authenticating with Google Service Account: ${creds.clientEmail}...`);
  const token = await getAccessToken(creds);
  console.log(`✅ OAuth2 Access Token obtained successfully.\n`);

  if (args.includes("--status") && args[1]) {
    const url = args[1];
    console.log(`🔍 Checking Google Indexing status for: ${url}`);
    const meta = await getMetadata(token, url);
    console.log(JSON.stringify(meta, null, 2));
    return;
  }

  let targetUrls = [];
  if (args.includes("--all") || args.length === 0) {
    try {
      targetUrls = await fetchSitemapUrls();
      console.log(`📋 Found ${targetUrls.length} URLs in sitemap.`);
    } catch (e) {
      console.warn(`⚠️ Could not fetch remote sitemap: ${e.message}. Using default core paths.`);
      targetUrls = ["/", "/tours/", "/destinations/", "/where-to-stay/", "/why-us/reviews/", "/about-us/", "/plan-my-trip/"];
    }
  } else {
    targetUrls = args.filter((a) => !a.startsWith("--"));
  }

  console.log(`🚀 Submitting ${targetUrls.length} URLs to Google Indexing API...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < targetUrls.length; i++) {
    const url = targetUrls[i];
    const result = await publishUrl(token, url, "URL_UPDATED");
    const progress = `[${i + 1}/${targetUrls.length}]`;

    if (result.ok) {
      success++;
      console.log(`✅ ${progress} ${result.url} (Notified: ${result.notifyTime || "OK"})`);
    } else {
      failed++;
      console.error(`❌ ${progress} ${result.url} (Failed: ${result.error})`);
    }

    // Google API rate limit pause (100ms)
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n========================================`);
  console.log(`🎯 Google Indexing Submission Complete`);
  console.log(`   Total URLs: ${targetUrls.length}`);
  console.log(`   ✅ Successful: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
