import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";
import { dataStore } from "./_shared/blob-store.js";
import { BILL_FILE_STORE } from "./_shared/lead-identity.js";

const ADMIN_TOKEN_SHA256_FALLBACK = "9485d055e7452983a9332b250fa1637bea7312ce5f0d1fbdde3e3fb9123ccde4";
const LEAD_ID_RE = /^[a-f0-9]{24}$/i;

function tokenFromRequest(request) {
  const auth = String(request.headers.get("authorization") || "");
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function authorized(request) {
  const supplied = tokenFromRequest(request);
  const expected = env("ECON_ADMIN_TOKEN");
  if (expected && expected.length >= 24) {
    if (!secureEqual(supplied, expected)) return { ok: false, status: 401, detail: "unauthorized" };
    return { ok: true, mode: "env_token" };
  }
  const expectedDigest = String(env("ECON_ADMIN_AUTH_DIGEST") || ADMIN_TOKEN_SHA256_FALLBACK).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedDigest)) return { ok: false, status: 503, detail: "admin_token_not_configured" };
  if (!supplied || !secureEqual(sha256Hex(supplied), expectedDigest)) return { ok: false, status: 401, detail: "unauthorized" };
  return { ok: true, mode: "sha256_digest" };
}

function manifestKey(leadId) {
  return `lead/${leadId}/bill/manifest`;
}

function safeFilename(value, contentType) {
  let name = String(value || "bolletta").replace(/[\\/\0\r\n\"']/g, "_").trim() || "bolletta";
  const extensionByType = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const ext = extensionByType[String(contentType || "").toLowerCase()] || "";
  if (ext && !/\.[a-z0-9]{2,5}$/i.test(name)) name += ext;
  return name.slice(0, 180);
}

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);
  const auth = authorized(request);
  if (!auth.ok) return json({ detail: auth.detail }, auth.status);

  try {
    const url = new URL(request.url);
    const leadId = String(url.searchParams.get("lead_id") || "").trim();
    if (!LEAD_ID_RE.test(leadId)) return json({ detail: "invalid_lead_id" }, 400);

    const store = dataStore(BILL_FILE_STORE, { consistency: "strong" });
    const manifest = await store.get(manifestKey(leadId), { type: "json" });
    if (!manifest?.blob_key) return json({ detail: "bill_not_found" }, 404);

    const bytes = await store.get(manifest.blob_key, { type: "arrayBuffer" });
    if (!bytes) return json({ detail: "bill_blob_missing" }, 404);

    const contentType = String(manifest.content_type || "application/octet-stream");
    const filename = safeFilename(manifest.original_filename, contentType);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength || 0),
        "content-disposition": `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
        "x-econ-lead-id": leadId,
        "x-econ-document-sha256": String(manifest.sha256 || ""),
      },
    });
  } catch (error) {
    return json({ detail: error instanceof Error ? error.message : "bill_download_failed" }, 500);
  }
};

export const config = {
  path: "/api/admin/bill",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { manifestKey, safeFilename, secureEqual, sha256Hex, authorized, LEAD_ID_RE };
