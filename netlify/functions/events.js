import { getStore } from "@netlify/blobs";
import { json, readJson, sameOriginRequest } from "./_shared/http.js";
import { safeSessionId, sanitizeEventDetail } from "./_shared/sanitize.js";

const ALLOWED_EVENTS = new Set([
  "screen_view", "bill_upload_started", "bill_parse_success", "bill_parse_failed", "bill_data_confirmed",
  "address_selected", "address_confirmed", "lead_form_opened", "lead_completed", "lead_save_failed"
]);

export default async (request) => {
  if (request.method !== "POST") return json({ detail: "method_not_allowed" }, 405);
  if (!sameOriginRequest(request)) return json({ detail: "origin_not_allowed" }, 403);
  try {
    const body = await readJson(request);
    const sessionId = safeSessionId(body.session_id);
    const event = String(body.event || "").trim();
    if (!sessionId || !ALLOWED_EVENTS.has(event)) return json({ detail: "invalid_event" }, 400);
    const payload = {
      schema: "econ.event.v1",
      session_id: sessionId,
      event,
      step: Number.isInteger(body.step) ? body.step : null,
      detail: sanitizeEventDetail(body.detail ?? {}),
      timestamp: new Date().toISOString(),
    };
    const store = getStore("econ-fv-events-v1");
    const key = `${payload.timestamp.slice(0, 10)}/${sessionId}/${Date.now()}-${crypto.randomUUID()}`;
    await store.setJSON(key, payload);
    return json({ ok: true }, 202);
  } catch (error) {
    return json({ detail: error instanceof Error ? error.message : "event_failed" }, 400);
  }
};

export const config = { path: "/api/events" };
