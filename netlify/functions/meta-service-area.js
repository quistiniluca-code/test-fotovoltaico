import { json, readJson, sameOriginRequest } from "./_shared/http.js";
import { safeSessionId } from "./_shared/sanitize.js";
import { leadIdForSession } from "./_shared/lead-identity.js";
import { classifyServiceArea } from "./_shared/service-area.js";
import { sendMetaServiceAreaEvent } from "./_shared/meta-capi.js";

const MAX_BODY_CHARS = 5000;

function validSignal(body) {
  if (body?.schema !== "econ.meta.service-area.v1") return "invalid_schema";
  if (!safeSessionId(body?.session_id)) return "invalid_session_id";
  const province = String(body?.property?.province || "").trim();
  const address = String(body?.property?.address || "").trim();
  if (!province && !address) return "property_location_required";
  return null;
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
    const serviceArea = classifyServiceArea(body.property || {});
    const eventId = `${leadId}:service-area`;

    if (serviceArea.status !== "IN_AREA") {
      return json({
        ok: true,
        service_area_status: serviceArea.status,
        service_area_region: serviceArea.region,
        service_area_province_code: serviceArea.province_code,
        meta_eligible: false,
        meta_capi: serviceArea.status === "OUT_OF_AREA" ? "skipped_out_of_area" : "skipped_unknown_area",
        event_id: eventId,
      });
    }

    const meta = await sendMetaServiceAreaEvent({
      request,
      body,
      leadId,
      clientIp: context?.ip || "",
    });

    return json({
      ok: true,
      service_area_status: serviceArea.status,
      service_area_region: serviceArea.region,
      service_area_province_code: serviceArea.province_code,
      meta_eligible: true,
      meta_capi: meta.status,
      event_id: meta.event_id || eventId,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "service_area_signal_failed";
    console.error("ECON service-area signal failed", detail);
    return json({ detail: "service_area_signal_failed" }, 500);
  }
};

export const config = {
  path: "/api/meta/service-area",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { validSignal, MAX_BODY_CHARS };
