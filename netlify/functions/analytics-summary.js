import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";

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
  ["Bolletta caricata", "bill_upload_started"],
  ["Bolletta letta", "bill_parse_success"],
  ["Dati confermati", "bill_data_confirmed"],
  ["Lead form", "lead_form_opened"],
  ["Lead completato", "lead_completed"],
];

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);
  if (!authorized(request)) return json({ detail: "unauthorized" }, 401);

  const store = getStore("econ-fv-events-v1");
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
    return { stage, sessions: count, rate_from_start: sessionCount ? Math.round((count / sessionCount) * 1000) / 10 : 0 };
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
  return json({
    version: "1.8-secure",
    sessions: sessionCount,
    funnel,
    commercial_requests: commercial,
    dropoff_last_screen: dropoff,
    crm_mode: env("ECON_CRM_MODE", "blobs"),
    event_count: events.length,
  });
};

export const config = {
  path: "/api/analytics/summary",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { authorized, secureEqual, sha256Hex, ADMIN_TOKEN_SHA256_FALLBACK };
