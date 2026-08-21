import { createHash } from "node:crypto";
import { env } from "./env.js";
import { classifyLeadQuality } from "./service-area.js";

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function cookieMap(request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(raw.split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf("=");
    return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function normalizedUserData(request, body, leadId) {
  const email = String(body?.contact?.email || "").trim().toLowerCase();
  const phone = String(body?.contact?.mobile || "").replace(/\D/g, "");
  const cookies = cookieMap(request);
  const userData = {
    em: email ? [sha256(email)] : undefined,
    ph: phone ? [sha256(phone)] : undefined,
    external_id: leadId ? [sha256(leadId)] : undefined,
    client_user_agent: request.headers.get("user-agent") || undefined,
    fbp: cookies._fbp || undefined,
    fbc: cookies._fbc || undefined,
  };
  return Object.fromEntries(Object.entries(userData).filter(([, value]) => value !== undefined));
}

function sourceUrl(request) {
  const referer = String(request.headers.get("referer") || "").trim();
  if (/^https:\/\//i.test(referer)) return referer.slice(0, 1000);
  const origin = String(request.headers.get("origin") || "").trim();
  return /^https:\/\//i.test(origin) ? origin.slice(0, 1000) : undefined;
}

function eligibleStatus(base, qualified) {
  return qualified ? `${base}_qualified` : base;
}

function metaEvent({ request, body, leadId, eventName, eventId }) {
  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: sourceUrl(request),
    user_data: normalizedUserData(request, body, leadId),
  };
  return Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined));
}

export async function sendMetaLeadEvent({ request, body, leadId }) {
  const quality = classifyLeadQuality(body);
  const serviceArea = quality.service_area;

  if (!quality.meta_lead_eligible) {
    return {
      status: serviceArea.status === "OUT_OF_AREA" ? "skipped_out_of_area" : "skipped_unknown_area",
      service_area: serviceArea,
      meta_lead_eligible: false,
      qualified_lead_eligible: false,
    };
  }

  const qualified = quality.qualified_lead_eligible;
  if (body?.tracking_consent?.marketing !== true) {
    return {
      status: eligibleStatus("eligible_skipped_no_marketing_consent", qualified),
      service_area: serviceArea,
      meta_lead_eligible: true,
      qualified_lead_eligible: qualified,
    };
  }

  const pixelId = String(env("ECON_META_PIXEL_ID") || "").trim();
  const accessToken = String(env("ECON_META_CAPI_ACCESS_TOKEN") || "").trim();
  if (!/^\d{5,25}$/.test(pixelId) || !accessToken) {
    return {
      status: eligibleStatus("eligible_skipped_not_configured", qualified),
      service_area: serviceArea,
      meta_lead_eligible: true,
      qualified_lead_eligible: qualified,
    };
  }

  const version = String(env("ECON_META_GRAPH_VERSION") || "").trim();
  const versionPath = /^v\d+\.\d+$/.test(version) ? `${version}/` : "";
  const endpoint = `https://graph.facebook.com/${versionPath}${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  const events = [metaEvent({ request, body, leadId, eventName: "Lead", eventId: leadId })];
  if (qualified) {
    events.push(metaEvent({ request, body, leadId, eventName: "QualifiedLead", eventId: `${leadId}:qualified` }));
  }
  const payload = { data: events };
  const testEventCode = String(env("ECON_META_TEST_EVENT_CODE") || "").trim();
  if (testEventCode) payload.test_event_code = testEventCode;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return {
      status: response.ok ? eligibleStatus("sent", qualified) : eligibleStatus(`eligible_failed_http_${response.status}`, qualified),
      service_area: serviceArea,
      meta_lead_eligible: true,
      qualified_lead_eligible: qualified,
    };
  } catch (error) {
    return {
      status: eligibleStatus("eligible_failed_network", qualified),
      detail: error instanceof Error ? error.name : "error",
      service_area: serviceArea,
      meta_lead_eligible: true,
      qualified_lead_eligible: qualified,
    };
  }
}

export const __test = { sha256, cookieMap, normalizedUserData, sourceUrl, eligibleStatus, metaEvent };
