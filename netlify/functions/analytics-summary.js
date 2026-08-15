import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";
import { dataStore } from "./_shared/blob-store.js";

const ADMIN_TOKEN_SHA256_FALLBACK = "9485d055e7452983a9332b250fa1637bea7312ce5f0d1fbdde3e3fb9123ccde4";

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function suppliedToken(request) {
  const auth = String(request.headers.get("authorization") || "");
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return String(request.headers.get("x-admin-token") || "").trim();
}

function authorized(request) {
  const supplied = suppliedToken(request);
  const expected = env("ECON_ADMIN_TOKEN");
  if (expected && expected.length >= 24) return secureEqual(supplied, expected);
  const digest = String(env("ECON_ADMIN_AUTH_DIGEST") || ADMIN_TOKEN_SHA256_FALLBACK).trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(digest) && Boolean(supplied) && secureEqual(sha256Hex(supplied), digest);
}

const STAGES = [
  ["Test avviato", 0],
  ["Bolletta selezionata", "bill_upload_started"],
  ["Bolletta letta", "bill_parse_success"],
  ["Dati confermati", "bill_data_confirmed"],
  ["Bolletta archiviata", "bill_archive_success"],
  ["Lead form", "lead_form_opened"],
  ["Lead completato", "lead_completed"],
];

function percentage(part, total) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);
  if (!authorized(request)) return json({ detail: "unauthorized" }, 401);

  const store = dataStore("econ-fv-events-v1");
  const { blobs } = await store.list();
  const events = [];
  for (const item of blobs.slice(-5000)) {
    const value = await store.get(item.key, { type: "json" });
    if (value) events.push(value);
  }
  const sessions = new Map();
  for (const event of events) {
    if (!event?.session_id) continue;
    const row = sessions.get(event.session_id) || [];
    row.push(event);
    sessions.set(event.session_id, row);
  }
  const sessionCount = sessions.size;
  const hasEvent = (rows, name) => rows.some(e => e.event === name);
  const hasScreen = (rows, n) => rows.some(e => e.event === "screen_view" && e.step === n);
  const funnel = STAGES.map(([stage, marker]) => {
    let count = 0;
    for (const rows of sessions.values()) {
      if (typeof marker === "number" ? hasScreen(rows, marker) : hasEvent(rows, marker)) count++;
    }
    return { stage, sessions: count, rate_from_start: percentage(count, sessionCount) };
  });

  let commercial = 0;
  const dropoff = {};
  for (const rows of sessions.values()) {
    if (rows.some(e => e.event === "lead_completed" && e.detail?.commercial_fv_request === true)) commercial++;
    const screens = rows.filter(e => e.event === "screen_view" && Number.isInteger(e.step)).map(e => e.step);
    if (screens.length) {
      const max = Math.max(...screens);
      dropoff[String(max)] = (dropoff[String(max)] || 0) + 1;
    }
  }

  const countEvent = name => events.filter(event => event.event === name).length;
  const billAttempts = countEvent("bill_upload_started");
  const billParsed = countEvent("bill_parse_success");
  const billParseFailed = countEvent("bill_parse_failed");
  const billArchived = countEvent("bill_archive_success");
  const billArchiveFailed = countEvent("bill_archive_failed");

  return json({
    version: "1.8-bill-resilience-v2",
    sessions: sessionCount,
    funnel,
    commercial_requests: commercial,
    dropoff_last_screen: dropoff,
    crm_mode: env("ECON_CRM_MODE", "blobs"),
    event_count: events.length,
    bill_pipeline: {
      upload_attempts: billAttempts,
      parse_success: billParsed,
      parse_failed: billParseFailed,
      archive_success: billArchived,
      archive_failed: billArchiveFailed,
      parse_success_rate: percentage(billParsed, billAttempts),
      archive_success_rate: percentage(billArchived, billAttempts),
    },
  });
};

export const config = {
  path: "/api/analytics/summary",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { authorized, secureEqual, sha256Hex, percentage, ADMIN_TOKEN_SHA256_FALLBACK };
