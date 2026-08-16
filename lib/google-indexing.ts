import { createSign } from "node:crypto";
import { SITE_URL } from "./site";

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const GOOGLE_INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const GOOGLE_METADATA_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications/metadata";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";

export type IndexNotificationType = "URL_UPDATED" | "URL_DELETED";

export type GoogleIndexingResult = {
  ok: boolean;
  url: string;
  type: IndexNotificationType;
  notifyTime?: string;
  error?: string;
  status?: number;
};

/**
 * Parses Google Service Account credentials from environment variables:
 * 1. GOOGLE_SERVICE_ACCOUNT_JSON (Full JSON key content)
 * 2. GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */
function getGoogleCredentials(): { clientEmail: string; privateKey: string } | null {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch (e) {
      console.error("[Google Indexing] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    // Handle escaped newlines in env variables
    privateKey = privateKey.replace(/\\n/g, "\n");
    return { clientEmail, privateKey };
  }

  return null;
}

/**
 * Creates an RS256-signed JWT token to request an OAuth2 access token from Google.
 */
function createSignedJwt(clientEmail: string, privateKey: string): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: INDEXING_SCOPE,
    aud: GOOGLE_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = base64Url(header);
  const encodedClaimSet = base64Url(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();

  const signature = signer
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

// In-memory token cache to avoid requesting a new token on every URL notification
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Gets a valid OAuth2 access token for Google Indexing API.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const credentials = getGoogleCredentials();
  if (!credentials) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const jwt = createSignedJwt(credentials.clientEmail, credentials.privateKey);

  try {
    const response = await fetch(GOOGLE_TOKEN_URI, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Google Indexing] Token request failed (${response.status}):`, errText);
      return null;
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };

    return cachedToken.token;
  } catch (err) {
    console.error("[Google Indexing] Error obtaining access token:", err);
    return null;
  }
}

/**
 * Formats relative path to absolute URL on the canonical production domain.
 */
export function toAbsoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const clean = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL.replace(/\/+$/, "")}${clean}`;
}

/**
 * Submits a single URL to the Google Indexing API for immediate crawling/indexing or removal.
 */
export async function publishUrlToGoogle(
  urlOrPath: string,
  type: IndexNotificationType = "URL_UPDATED"
): Promise<GoogleIndexingResult> {
  const fullUrl = toAbsoluteUrl(urlOrPath);
  const token = await getGoogleAccessToken();

  if (!token) {
    return {
      ok: false,
      url: fullUrl,
      type,
      error: "Google Service Account credentials not configured or token failed",
    };
  }

  try {
    const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fullUrl,
        type,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        url: fullUrl,
        type,
        status: response.status,
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      url: fullUrl,
      type,
      status: 200,
      notifyTime: data?.urlNotificationMetadata?.latestUpdate?.notifyTime || new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      url: fullUrl,
      type,
      error: err instanceof Error ? err.message : "Network error contacting Google Indexing API",
    };
  }
}

/**
 * Checks Google's indexing notification metadata for a given URL.
 */
export async function getUrlIndexingMetadata(urlOrPath: string) {
  const fullUrl = toAbsoluteUrl(urlOrPath);
  const token = await getGoogleAccessToken();

  if (!token) {
    return { ok: false, error: "Google Service Account credentials not configured" };
  }

  try {
    const endpoint = `${GOOGLE_METADATA_ENDPOINT}?url=${encodeURIComponent(fullUrl)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, status: response.status, error: data?.error?.message || `HTTP ${response.status}` };
    }

    return { ok: true, metadata: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to query metadata" };
  }
}

/**
 * Submits a batch of URLs with rate limiting (max 10 parallel requests).
 */
export async function batchPublishUrlsToGoogle(
  urls: string[],
  type: IndexNotificationType = "URL_UPDATED",
  delayMs = 150
): Promise<GoogleIndexingResult[]> {
  const results: GoogleIndexingResult[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const res = await publishUrlToGoogle(url, type);
    results.push(res);

    if (delayMs > 0 && i < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
