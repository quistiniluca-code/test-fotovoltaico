import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";

const LEAD_STORE = "econ-fv-leads-prelive";
const ADMIN_TOKEN_SHA256_FALLBACK = "9485d055e7452983a9332b250fa1637bea7312ce5f0d1fbdde3e3fb9123ccde4";

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
  if (!/^[a-f0-9]{64}$/.test(expectedDigest)) {
    return { ok: false, status: 503, detail: "admin_token_not_configured" };
  }
  if (!supplied || !secureEqual(sha256Hex(supplied), expectedDigest)) {
    return { ok: false, status: 401, detail: "unauthorized" };
  }
  return { ok: true, mode: "sha256_digest" };
}

function normalizeRecord(key, value, metadata) {
  if (value?.schema === "econ.lead.record.v1" && value?.lead) return value;
  const leadId = String(key).split("/").pop() || "";
  return {
    schema: "econ.lead.record.legacy",
    lead_id: leadId,
    server: {
      created_at: metadata?.metadata?.created_at || null,
      updated_at: metadata?.metadata?.updated_at || metadata?.metadata?.created_at || null,
      storage: "netlify_blobs",
      store: LEAD_STORE,
    },
    lead: value,
  };
}

function summary(record) {
  const lead = record?.lead || {};
  return {
    lead_id: record?.lead_id || null,
    created_at: record?.server?.created_at || null,
    updated_at: record?.server?.updated_at || null,
    first_name: lead?.contact?.first_name || null,
    last_name: lead?.contact?.last_name || null,
    mobile: lead?.contact?.mobile || null,
    email: lead?.contact?.email || null,
    commercial_fv_request: Boolean(lead?.contact?.commercial_fv_request),
    address: lead?.property?.address || null,
    score: Number(lead?.test?.score) || 0,
    supplier: lead?.bill_summary?.supplier || null,
    annual_kwh: lead?.bill_summary?.annual_kwh ?? null,
    annual_spend: lead?.bill_summary?.annual_spend ?? null,
    privacy_version: lead?.privacy?.version || null,
  };
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const columns = [
    "lead_id", "created_at", "updated_at", "first_name", "last_name", "mobile", "email",
    "commercial_fv_request", "address", "score", "supplier", "annual_kwh", "annual_spend", "privacy_version",
  ];
  return [columns.join(","), ...rows.map(row => columns.map(key => csvCell(row[key])).join(","))].join("\n");
}

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);
  const auth = authorized(request);
  if (!auth.ok) return json({ detail: auth.detail }, auth.status);

  try {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(250, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const full = url.searchParams.get("detail") === "full";
    const format = String(url.searchParams.get("format") || "json").toLowerCase();

    const store = getStore(LEAD_STORE);
    const { blobs } = await store.list({ prefix: "lead/" });
    const records = [];

    for (const blob of blobs) {
      try {
        const [value, metadata] = await Promise.all([
          store.get(blob.key, { type: "json" }),
          store.getMetadata(blob.key),
        ]);
        if (value) records.push(normalizeRecord(blob.key, value, metadata));
      } catch {
        // Keep one malformed entry from blocking access to the remaining leads.
      }
    }

    records.sort((a, b) => String(b?.server?.updated_at || b?.server?.created_at || "").localeCompare(String(a?.server?.updated_at || a?.server?.created_at || "")));
    const page = records.slice(offset, offset + limit);
    const summaries = page.map(summary);

    if (format === "csv") {
      return new Response(toCsv(summaries), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="econ-fv-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    return json({
      ok: true,
      storage: "netlify_blobs",
      store: LEAD_STORE,
      total: records.length,
      offset,
      limit,
      returned: page.length,
      auth_mode: auth.mode,
      leads: full ? page : summaries,
    });
  } catch (error) {
    return json({ detail: error instanceof Error ? error.message : "lead_storage_read_failed" }, 500);
  }
};

export const config = {
  path: "/api/admin/leads",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { secureEqual, sha256Hex, authorized, normalizeRecord, summary, toCsv, ADMIN_TOKEN_SHA256_FALLBACK };
