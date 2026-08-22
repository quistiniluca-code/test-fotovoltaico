import { createHash } from "node:crypto";
import { env } from "./env.js";
import { classifyLeadQuality, classifyServiceArea } from "./service-area.js";

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function normalizedText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function cookieMap(request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(raw.split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf("=");
    return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function clientIpFromRequest(request, explicitIp = "") {
  const direct = String(explicitIp || "").trim();
  if (direct) return direct.slice(0, 80);
  const netlifyHeader = String(request.headers.get("x-nf-client-connection-ip") || "").trim();
  if (netlifyHeader) return netlifyHeader.slice(0, 80);
  const forwarded = String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return forwarded ? forwarded.slice(0, 80) : undefined;
}

function fbcFromAttribution(body) {
  const fbclid = String(body?.attribution?.fbclid || body?.fbclid || "").trim();
  if (!fbclid || fbclid.length > 500 || /\s/.test(fbclid)) return undefined;
  const suppliedTs = Number(body?.attribution?.landing_timestamp_ms);
  const timestampMs = Number.isFinite(suppliedTs) && suppliedTs > 0 ? Math.floor(suppliedTs) : Date.now();
  return `fb.1.${timestampMs}.${fbclid}`;
}

function normalizedUserData(request, body, leadId, explicitIp = "") {
  const email = String(body?.contact?.email || "").trim().toLowerCase();
  const phone = String(body?.contact?.mobile || "").replace(/\D/g, "");
  const firstName = normalizedText(body?.contact?.first_name);
  const lastName = normalizedText(body?.contact?.last_name);
  const cookies = cookieMap(request);
  const userData = {
    em: email ? [sha256(email)] : undefined,
    ph: phone ? [sha256(phone)] : undefined,
    fn: firstName ? [sha256(firstName)] : undefined,
    ln: lastName ? [sha256(lastName)] : undefined,
    external_id: leadId ? [sha256(leadId)] : undefined,
    client_ip_address: clientIpFromRequest(request, explicitIp),
    client_user_agent: request.headers.get("user-agent") || undefined,
    fbp: cookies._fbp || undefined,
    fbc: cookies._fbc || fbcFromAttribution(body),
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

function eligibleFailureStatus(status) {
  if (status === "failed_network") return "eligible_failed_network";
  if (status === "not_configured") return "eligible_skipped_not_configured";
  if (String(status || "").startsWith("failed_http_")) return `eligible_${status}`;
  return `eligible_${String(status || "failed_unknown")}`;
}

function metaEvent({ request, body, leadId, eventName, eventId, clientIp = "" }) {
  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: sourceUrl(request),
    user_data: normalizedUserData(request, body, leadId, clientIp),
  };
  return Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined));
}

function metaEndpoint() {
  const pixelId = String(env("ECON_META_PIXEL_ID") || "").trim();
  const accessToken = String(env("ECON_META_CAPI_ACCESS_TOKEN") || "").trim();
  if (!/^\d{5,25}$/.test(pixelId) || !accessToken) return null;
  const version = String(env("ECON_META_GRAPH_VERSION") || "").trim();
  const versionPath = /^v\d+\.\d+$/.test(version) ? `${version}/` : "";
  return `https://graph.facebook.com/${versionPath}${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
}

async function postMetaEvents(events) {
  const endpoint = metaEndpoint();
  if (!endpoint) return { ok: false, status: "not_configured" };
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
    return { ok: response.ok, status: response.ok ? "sent" : `failed_http_${response.status}` };
  } catch (error) {
    return { ok: false, status: "failed_network", detail: error instanceof Error ? error.name : "error" };
  }
}

export async function sendMetaLeadEvent({ request, body, leadId, clientIp = "" }) {
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

  if (!metaEndpoint()) {
    return {
      status: eligibleStatus("eligible_skipped_not_configured", qualified),
      service_area: serviceArea,
      meta_lead_eligible: true,
      qualified_lead_eligible: qualified,
    };
  }

  const events = [metaEvent({ request, body, leadId, eventName: "Lead", eventId: leadId, clientIp })];
  if (qualified) {
    events.push(metaEvent({ request, body, leadId, eventName: "QualifiedLead", eventId: `${leadId}:qualified`, clientIp }));
  }
  const result = await postMetaEvents(events);
  const baseStatus = result.ok ? "sent" : eligibleFailureStatus(result.status);
  return {
    status: eligibleStatus(baseStatus, qualified),
    detail: result.detail,
    service_area: serviceArea,
    meta_lead_eligible: true,
    qualified_lead_eligible: qualified,
  };
}

export async function sendMetaServiceAreaEvent({ request, body, leadId, clientIp = "" }) {
  const serviceArea = classifyServiceArea(body?.property || {});
  const eventId = `${leadId}:service-area`;

  if (serviceArea.status !== "IN_AREA") {
    return {
      status: serviceArea.status === "OUT_OF_AREA" ? "skipped_out_of_area" : "skipped_unknown_area",
      service_area: serviceArea,
      event_id: eventId,
    };
  }
  if (body?.tracking_consent?.marketing !== true) {
    return { status: "eligible_skipped_no_marketing_consent", service_area: serviceArea, event_id: eventId };
  }
  if (!metaEndpoint()) {
    return { status: "eligible_skipped_not_configured", service_area: serviceArea, event_id: eventId };
  }

  const event = metaEvent({
    request,
    body,
    leadId,
    eventName: "ServiceAreaQualified",
    eventId,
    clientIp,
  });
  const result = await postMetaEvents([event]);
  return {
    status: result.ok ? "sent" : eligibleFailureStatus(result.status),
    detail: result.detail,
    service_area: serviceArea,
    event_id: eventId,
  };
}

export const __test = {
  sha256,
  normalizedText,
  cookieMap,
  clientIpFromRequest,
  fbcFromAttribution,
  normalizedUserData,
  sourceUrl,
  eligibleStatus,
  eligibleFailureStatus,
  metaEvent,
};
