import { json, readJson, sameOriginRequest } from "./_shared/http.js";
import { safeSessionId } from "./_shared/sanitize.js";
import { leadIdForSession } from "./_shared/lead-identity.js";
import { classifyServiceArea } from "./_shared/service-area.js";
import { sendMetaJourneyEvent } from "./_shared/meta-capi.js";
import { persistEngagement } from "./_shared/engagement-store.js";

const MAX_BODY_CHARS = 12000;
const ALLOWED_EVENTS = new Set(["PageView", "TestStarted", "WhatsAppIntent"]);
const EVENT_ID_RE = /^[A-Za-z0-9._:-]{8,180}$/;

function validSignal(body) {
  if (body?.schema !== "econ.meta.journey.v1") return "invalid_schema";
  if (!safeSessionId(body?.session_id)) return "invalid_session_id";
  if (!ALLOWED_EVENTS.has(String(body?.event_name || ""))) return "invalid_event_name";
  if (!EVENT_ID_RE.test(String(body?.event_id || "").trim())) return "invalid_event_id";
  return null;
}

function sanitizedDetail(detail = {}) {
  const input = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : {};
  const out = {};
  for (const [key, value] of Object.entries(input).slice(0, 30)) {
    const safeKey = String(key).replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
    if (!safeKey) continue;
    if (typeof value === "string") out[safeKey] = value.slice(0, 300);
    else if (typeof value === "number" && Number.isFinite(value)) out[safeKey] = value;
    else if (typeof value === "boolean" || value === null) out[safeKey] = value;
  }
  return out;
}

export default async (request, context) => {
  if (request.method !== "POST") return json({ detail: "method_not_allowed" }, 405);
  if (!sameOriginRequest(request)) return json({ detail: "origin_not_allowed" }, 403);

  try {
    const body = await readJson(request);
    if (JSON.stringify(body).length > MAX_BODY_CHARS) return json({ detail: "signal_payload_too_large" }, 413);
    const problem = validSignal(body);
    if (problem) return json({ detail: problem }, 400);

    const sessionId = safeSessionId(body.session_id);
    const leadId = leadIdForSession(sessionId);
    const eventName = String(body.event_name);
    const eventId = String(body.event_id).trim();
    const serviceArea = classifyServiceArea(body?.property || {});
    const detail = sanitizedDetail(body?.detail || {});

    let crm = null;
    if (eventName === "WhatsAppIntent") {
      crm = await persistEngagement({
        eventId,
        sessionId,
        leadId,
        type: "whatsapp_intent",
        serviceArea,
        attribution: body?.attribution || {},
        detail,
      });
    }

    const meta = await sendMetaJourneyEvent({
      request,
      body: { ...body, detail },
      leadId,
      eventName,
      eventId,
      clientIp: context?.ip || "",
    });

    return json({
      ok: true,
      event_name: eventName,
      event_id: eventId,
      lead_id: leadId,
      event_semantics: eventName === "PageView" || eventName === "TestStarted" ? "micro" : "intent",
      service_area_status: serviceArea.status,
      service_area_region: serviceArea.region,
      service_area_province_code: serviceArea.province_code,
      meta_eligible: Boolean(meta.meta_eligible),
      meta_capi: meta.status,
      meta_match_quality: meta.match_quality || null,
      crm_engagement_persisted: Boolean(crm?.blob_persisted),
      crm_database_persisted: crm?.database_persisted ?? null,
    }, 202);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "meta_journey_failed";
    console.error("ECON Meta journey failed", detail);
    return json({ detail: "meta_journey_failed" }, 500);
  }
};

export const config = {
  path: "/api/meta/journey",
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { validSignal, sanitizedDetail, ALLOWED_EVENTS, EVENT_ID_RE, MAX_BODY_CHARS };
