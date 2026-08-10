import { getStore } from "@netlify/blobs";
import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";

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
  const token = env("ECON_ADMIN_TOKEN");
  if (token && request.headers.get("x-admin-token") !== token) return json({ detail: "unauthorized" }, 401);
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
    version: "1.6",
    sessions: sessionCount,
    funnel,
    commercial_requests: commercial,
    dropoff_last_screen: dropoff,
    crm_mode: env("ECON_CRM_MODE", "blobs"),
    event_count: events.length,
  });
};

export const config = { path: "/api/analytics/summary" };
